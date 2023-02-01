/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * 
 * Module Description: Mass Invoice Email
 * 
 * @Last Modified by:   Anesu Chakaingesu
 * 
 */

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/task', 'N/format', 'N/currentRecord', 'N/render'],
function(ui, email, runtime, search, record, http, log, redirect, task, format, currentRecord, render) {
    var baseURL = 'https://1048144.app.netsuite.com';
    if (runtime.envType == "SANDBOX") {
        baseURL = 'https://1048144-sb3.app.netsuite.com';
    }
    var role = runtime.getCurrentUser().role;
    var zee = 0;
    var currRec = currentRecord.get();
    var ctx = runtime.getCurrentScript();

    // Date Today n Date Tomorrow
    var today_date = new Date(); // Test Time 6:00pm - '2022-06-29T18:20:00.000+10:00'
    today_date.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
    today_date = dateISOToNetsuite(today_date);
    today_date = format.parse({ value: today_date, type: format.Type.DATE }); // Reformat Date

    var sent_invoices = [];
    // var sent_invoices = ["4131738"]

    function main() {
        /**
         *  Work Flow:
         *  // Send Email
            // Add New Line in Record
            // Once Completed List, Delete All Records.
         */

        // Get Results
        var taskIdSet = JSON.parse(JSON.stringify(ctx.getParameter({ name: 'custscript_ss_mass_inv_email_task_set'})));
        var totalInvCount = parseInt(ctx.getParameter({ name: 'custscript_ss_mass_inv_email_tot_num_inv'}));
        var selectedZeeSet = new Array();
        selectedZeeSet = JSON.parse(JSON.stringify(ctx.getParameter({ name: 'custscript_ss_mass_inv_email_zee_set'})));
        var user_email = ctx.getParameter({ name: 'custscript_ss_mass_inv_email_user_email'});
        var main_index = parseInt(ctx.getParameter({ name: 'custscript_ss_mass_inv_email_main_index'}))
        if (isNullorEmpty(main_index) || isNaN(main_index)){
            main_index = 0;
        }
        var invoiceSet = JSON.parse(JSON.stringify({ name: 'custscript_ss_mass_inv_email_inv_set'}));
        if (invoiceSet.length > 1){
            invoiceSet = invoiceSet.split("\u0005") // Remove NetSuite Random Space Thingo.
        } else {
            invoiceSet = [];
        }
        // Testing
        // var selectedZeeSet = [779884] // TEST
        // var taskIdSet = 272834; // TEST - NSW
        // var totalInvCount = 2; // 2 Invoices
        
        // Log Values: TESTs
        log.debug({
            title: 'Executed Order 66: ZEE Ready',
            details: selectedZeeSet
        });
        log.debug({
            title: 'Executed Order 66: TASK Ready',
            details: taskIdSet
        });
        log.debug({
            title: 'Main Index: Ready',
            details: main_index
        });
        log.debug({
            title: 'Invoice Set: Ready',
            details: invoiceSet
        });

        if (!isNullorEmpty(selectedZeeSet)){ // Verify Zee Set Exists.
            // Delete List Record All.
            deleteSentList(main_index); // Only Delete List on First Run.
            log.debug({
                title: 'INVOICES ALREADY SENT',
                details: sent_invoices
            });
            
            log.debug({
                title: 'Type Of',
                details: typeof selectedZeeSet
            });
            if (main_index == 0){
                if (selectedZeeSet.length > 1){
                    log.debug({
                        title: 'Selected Zee: Split Array',
                        details: selectedZeeSet
                    });
                    selectedZeeSet = selectedZeeSet.split("\u0005") // Remove NetSuite Random Space Thingo.
                }
            } else {
                log.debug({
                    title: 'Selected Zee: Rescheduled Index, Array?',
                    details: selectedZeeSet
                });
                selectedZeeSet = JSON.parse(selectedZeeSet)
            }
            if (selectedZeeSet.length > 0){ // Ensures that Only when the Selected Zee List is populated, it will filter.
                // Load Search
                var invSearch = search.load({ type: 'invoice', id: 'customsearch_mass_inv_email_list' });
                invSearch.filters.push(search.createFilter({
                    name: 'partner',
                    operator: search.Operator.ANYOF,
                    values: selectedZeeSet
                }));
                invSearch.filters.push(search.createFilter({
                    name: 'email',
                    operator: search.Operator.ISNOTEMPTY,
                    values: null
                }));
                if (sent_invoices != null && sent_invoices.length > 0){
                    invSearch.filters.push(search.createFilter({
                        name: 'internalid',
                        operator: search.Operator.NONEOF,
                        values: sent_invoices
                    }));
                }
                var invSearchRes = invSearch.run(); // Search Result
                // if (main_index == 0) { // Update Total Invoice Count on First Run.
                    // totalInvCount = invSearch.runPaged().count;
                    var invResLength = invSearch.runPaged().count;
                // }
                
                // log.debug({
                //     title: 'Search Length',
                //     details: totalInvCount
                // });
                var invResultSet = []; // Sudo Array Containing Complete Search Data
                for (var data_index = 0; data_index < invResLength; data_index += 1000) {
                    invResultSet.push(invSearchRes.getRange({ start: data_index, end: data_index + 999 }));
                }
                log.debug({
                    title: 'Search Result Set',
                    details: invResultSet
                });
                // Loop Through Search Results and Log
                var result_count = 0;
                for (var i = 0; i < invResultSet.length; i++) {
                    var invResult = invResultSet[i];
                    log.debug({
                        title: 'Search Result Set: ' + i,
                        details: invResult.length
                    });
                    result_count = result_count + invResult.length;
                }
                log.debug({
                    title: 'Total Search Result',
                    details: result_count
                });

                // TEST DATA
                /**
                 *  For Loop
                 *  Index = 0;
                 *  var data_index = 650;
                 *  data_index < 1500;
                 *  data_index += 1000;
                 * 
                 *  zendeskSearchRes.getRange({ start: 650, end:  650 + 999 == 1649}) });
                 *  THIS WILL NOT RUN AS ITS OVER 1500 zendeskSearchRes.getRange({ start: 1650, end: 1350 + 999 = 2349 }) });
                 *  THIS DOES NO RUN AS ITS ENDING AT 1500. zendeskSearchRes.getRange({ start: 2000, end: 2000 + 999 = 2999 });
                 *  
                 */

                var index = 0;
                for (var inv_data_index = 0; inv_data_index < invResultSet.length; inv_data_index++){
                    invResultSet[inv_data_index].every(function(invData){ //, index, arr
                        var usageLimit = ctx.getRemainingUsage();
                        log.debug({
                            title: 'usageLimit',
                            details: usageLimit
                        });

                        // If SS Breaker has been scheduled, stop the script.
                        // try {
                        //     var ss_breaker = task.create({
                        //         taskType: task.TaskType.SCHEDULED_SCRIPT,
                        //         scriptId: 'customscript_ss_breaker',
                        //         deploymentId: 'customdeploy_ss_breaker_pending',
                        //     });
                        //     var ss_breaker_task_id = ss_breaker.submit();
                        //     var scriptStatus = task.checkStatus({
                        //         taskId: ss_breaker_task_id
                        //     });
                        //     log.debug({
                        //         title: 'Script Status',
                        //         details: scriptStatus.status
                        //     });
                        // } catch (error) {
                        //     log.debug({
                        //         title: 'Error: SS Break Status',
                        //         details: error
                        //     });
                        // }
                        // if (scriptStatus.status == 'PENDING') { return false } else
                        
                        if (usageLimit < 200) { // TESTING PURPOSES: || index == 150
                            params = {
                                custscript_ss_mass_inv_email_task_set: taskIdSet,
                                custscript_ss_mass_inv_email_zee_set: selectedZeeSet,
                                custscript_ss_mass_inv_email_main_index: main_index + index,
                                custscript_ss_mass_inv_email_tot_num_inv: totalInvCount,
                                custscript_ss_mass_inv_email_user_email: user_email,
                                custscript_ss_mass_inv_email_inv_set: invoiceSet,
                            };
                            var reschedule = task.create({
                                taskType: task.TaskType.SCHEDULED_SCRIPT,
                                scriptId: 'customscript_ss_mass_inv_email',
                                deploymentId: 'customdeploy_ss_mass_inv_email',
                                params: params
                            });
                            var reschedule_id = reschedule.submit();
                            log.error({
                                title: 'Attempting: Rescheduling Script',
                                details: JSON.stringify(reschedule_id)
                            });
                            return false;
                        } else {
                            log.debug({
                                title: 'Indexes: Main + Index',
                                details: main_index + " | " + index
                            });
                            // Customer Details 
                            var internalid = invData.getValue({ name: "internalid", join: 'customer' });
                            var entityid = invData.getValue({ name: "entityid", join: 'customer' });
                            var companyname = invData.getValue({ name: 'companyname', join: 'customer'  });
                            var email_address = invData.getValue({ name: 'email', join: 'customer'  });
                            var cc_email = invData.getValue({ name: 'custentity_accounts_cc_email', join: 'customer' });
                            cc_email = formatCCEmail(cc_email)
                            
                            var cc_address = [];
                            if (cc_email.length > 1){ // More than one Email in Array.
                                cc_email.forEach(function(el){
                                    if (el.length > 4){ // Make Sure Elements (Email) length is not Blank and includes minimum 4 Characters (.com)
                                        cc_address.push(el);
                                    }
                                });
                            } else {
                                cc_address.push(cc_email); // If Only One, Push Email into Saved CC Array.
                            }

                            // Invoice Details
                            var inv_id = invData.getValue({ name: 'internalid' });
                            var inv_type = invData.getText({ name: 'custbody_inv_type' });
                            var tot_am = '$' + invData.getValue({ name: 'amount' });
                            if (isNullorEmpty(inv_type)) {
                                inv_type = 'Service';
                            }
                            var doc_num = invData.getValue({ name: 'tranid' });
                            var days_open = invData.getValue({ name: 'daysopen' });

                            var zee_name = invData.getText({ name: 'partner' });

                            try {
                                // Create Object
                                createSentList(inv_id, doc_num, entityid, companyname, inv_type, tot_am, days_open, zee_name);

                                // Save Invoices - Secondly
                                var attachments = [];
                                var invFile = getInvoiceFiles(inv_id);
                                attachments.push(invFile);

                                //Send Email
                                sendEmail(internalid, companyname, email_address, attachments, doc_num, user_email, cc_address); 

                                // Set Invoice to Emailed and Date | After Emailed.
                                setInvoiceData(inv_id);
                            } catch (e) {
                                log.error({
                                    title: 'Send Email Error',
                                    details: e
                                });
                                email.send({
                                    author: 35031, // Accounts: 35031 | Customer Service: 112209
                                    body: 'Error for Customer ID '+ internalid +' | Company Name ' + companyname + ' | with Invoice ID '+ inv_id + '\n\n' + e, // Get Email Template
                                    subject: 'Mass Invoice Email: Error',
                                    recipients: ['anesu.chakaingesu@mailplus.com.au'], // , 'popie.popie@mailplus.com.au'
                                    attachments: new Array(getInvoiceFiles(inv_id)),
                                });
                            }
                            
                            index++;
                            return true;
                        }
                    })
                }  
            }
        }
        setTaskCompleted(taskIdSet); // Set Task As Completed
        log.debug({
            title: 'END SCRIPT'
        })
    }

    function sendEmail(custSet, companyname, email_address, attachments, invoice_number, user_email, cc_address){
        // log.debug({
        //     title: 'Email Address',
        //     details: email_address
        // })
        var email_template = emailTemplate();
        if (!isNullorEmpty(cc_address)){ // CC Field Does
            email.send({
                author: 35031, // Accounts: 35031 | Customer Service: 112209
                body: email_template, // Get Email Template
                subject: 'MailPlus Invoice: ' + invoice_number,
                recipients: [email_address], // 'anesu.chakaingesu@mailplus.com.au' | email_address
                cc: [cc_address], // 'anesu.chakaingesu@mailplus.com.au' | cc_address
                attachments: attachments,
                relatedRecords:{
                    entityId: custSet // Add Email Reminder Notification as Message Under Customer
                }
            });
        } else { // CC Field Does Not Exist
            email.send({
                author: 35031, // Accounts: 35031 | Customer Service: 112209
                body: email_template, // Get Email Template
                subject: 'MailPlus Invoice: ' + invoice_number,
                recipients: [email_address], // 'anesu.chakaingesu@mailplus.com.au' | email_address
                attachments: attachments,
                relatedRecords:{
                    entityId: custSet // Add Email Reminder Notification as Message Under Customer
                }
            });
        }
        log.debug({
            title: 'Send Out Emails: Attachments and Data',
            details: custSet + ' ' +  companyname + ' ' + email_address + ' ' + attachments
        })
    }

    function getInvoiceFiles(entityId){
        var transactionFile = render.transaction({
            entityId: parseInt(entityId),
            printMode: render.PrintMode.PDF
        });
        log.debug({
            title: 'Invoice File',
            details: transactionFile
        })
        return transactionFile;
    }

    function setInvoiceData(invoice_id){
        var rec = record.load({ type: 'invoice', id: invoice_id })
        rec.setValue({ fieldId: 'custbody_invoice_emailed_date', value: today_date });
        rec.setValue({ fieldId: 'custbody_invoice_emailed', value: true }); // true | TEST = false
        rec.save();

        return true;
    }

    function setTaskCompleted(taskIdSet){
        // Set Task as Completed;
        if (taskIdSet.length > 1){
            taskIdSet = taskIdSet.split("\u0005") // Remove NetSuite Random Space Thingo.
        }
        taskIdSet.forEach(function(taskId){
            var taskRec = record.load({ type: 'task', id: taskId});
            taskRec.setValue({ fieldId: 'status', value: "COMPLETE" }) // Set to Completed;
            taskRec.save();
        });

        return true;
    }

    function createSentList(inv_id, doc_num, entityid, companyname, inv_type, tot_am, days_open, zee_name) {
        var sentListRec = record.create({
            type: 'customrecord_mass_inv_email_list',
            isDynamic: true,
        });
        sentListRec.setValue({ fieldId: 'name' , value: inv_id });
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_zee_name' , value: zee_name}); //
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_doc_num' , value: doc_num});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_entityid' , value: entityid});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_companyname' , value: companyname});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_inv_type' , value: inv_type});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_tot_am' , value: tot_am});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_days_open' , value: days_open});
        sentListRec.save();

        return true;
    }

    function deleteSentList(main_index){ // Populate List of Invoices Already Sent
        log.debug({ title: 'Deleting Records', details: main_index });
        var invRecEmailList = search.load({
            id: 'customsearch_mass_inv_email_list_2',
            type: 'customrecord_mass_inv_email_list'
        });
        invRecEmailList.run().each(function(res){
            sent_invoices.push(res.getValue({ name: 'name' })); // populate list of invoices
            if (main_index == 0){
                record.delete({
                    type: 'customrecord_mass_inv_email_list',
                    id: res.getValue({ name: 'internalid' })
                });
            }
            return true;
        });
    }

    function emailTemplate(){ //companyname, email_address
        var emailMerger = render.mergeEmail({
            templateId: 177, //. Mass Invoice Email Template - 363 | Invoice Email - 177
            entity: null,
            recipient: null,
            supportCaseId: null,
            transactionId: null,
            customRecord: null
        });
        var html_body = emailMerger.body;
        return html_body;
    }

    function formatCCEmail(email_address) {
        // var email_address = email_address.replace(/ /g, '');
        var cc_address = email_address.replace(/\s/g, ''); // Remove Spaces.
        cc_address = cc_address.toLowerCase(); // Lowercases everything
        cc_address = cc_address.split(','); // Split Comma to Array.

        return cc_address;
    }

    /**
         * Used to pass the values of `date_from` and `date_to` between the scripts and to Netsuite for the records and the search.
         * @param   {String} date_iso       "2020-06-01"
         * @returns {String} date_netsuite  "1/6/2020"
         */
    function dateISOToNetsuite(date_iso) {
        var date_netsuite = '';
        if (!isNullorEmpty(date_iso)) {
            var date_utc = new Date(date_iso);
            // var date_netsuite = nlapiDateToString(date_utc);
            var date_netsuite = format.format({
                value: date_utc,
                type: format.Type.DATE
            });
        }
        return date_netsuite;
    }

    function isNullorEmpty(strVal) {
        return (strVal == null || strVal == '' || strVal == 'null' || strVal == undefined || strVal == 'undefined' || strVal == '- None -');
    }

    return {
        execute: main
    }
});