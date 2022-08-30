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
    // today_date = format.parse({ value: today_date, type: format.Type.DATE }); // Reformat Date

    function main() {
        // Get Results
        var taskIdSet = ctx.getParameter({ name: 'custscript_ss_mass_inv_email_task_set'});
        var totalInvCount = ctx.getParameter({ name: 'custscript_ss_mass_inv_email_tot_num_inv'})
        var selectedZeeSet = new Array();
        selectedZeeSet = JSON.parse(JSON.stringify(ctx.getParameter({ name: 'custscript_ss_mass_inv_email_zee_set'})));
        // Testing
        // var selectedZeeSet = [779884] // TEST
        // var taskIdSet = 272834; // TEST - NSW
        // var totalInvCount = 2; // 2 Invoices
        var user_email = ctx.getParameter({ name: 'custpage_mass_inv_email_user_email'});
        
        log.debug({
            title: 'Executed Order 66',
            details: selectedZeeSet
        });
        /**
         *  Work Flow:
         *  // Send Email
            // Add New Line in Record
            // Once Completed List, Delete All Records.
         */
        // Make Result Set Bigger.
        var main_index = 0;
        var zeeResultSet = [];

        // Delete List Record All.
        deleteSentList();
        log.debug({
            title: 'End Scheduled Script',
        });

        // Search
        var zeeSearch = search.load({ type: 'invoice', id: 'customsearch_mass_inv_email_list' });
        if (!isNullorEmpty(selectedZeeSet)){
            // log.debug({
            //     title: 'Type Of',
            //     details: typeof selectedZeeSet
            // });
            if (selectedZeeSet.length > 1){
                selectedZeeSet = selectedZeeSet.split("\u0005") // Remove NetSuite Random Space Thingo.
            }
            zeeSearch.filters.push(search.createFilter({
                name: 'partner',
                operator: search.Operator.ANYOF,
                values: selectedZeeSet
            }));
            zeeSearch.filters.push(search.createFilter({
                name: 'email',
                operator: search.Operator.ISNOTEMPTY,
                values: null
            }));
        }
        var zeeSearchRes = zeeSearch.run(); // Search Result
        var zeeResLength = zeeSearch.runPaged().count;
        log.debug({
            title: 'Search Length',
            details: zeeResLength
        });
        // for (var main_index = 0; main_index < 10000; main_index += 1000) {
        //     zeeResultSet.push(zeeSearchRes.getRange({ start: main_index, end: main_index + 999 }));
        // }
        var index = 0;
        zeeSearchRes.each(function(res){
            // Customer Details
            var internalid = res.getValue({ name: "internalid", join: 'customer' });
            var entityid = res.getValue({ name: "entityid", join: 'customer' });
            var companyname = res.getValue({ name: 'companyname', join: 'customer'  });
            var email_address = res.getValue({ name: 'email', join: 'customer'  });
            // Invoice Details
            var inv_id = res.getValue({ name: 'internalid' });
            var inv_type = res.getText({ name: 'custbody_inv_type' });
            var tot_am = '$' + res.getValue({ name: 'amount' });
            if (isNullorEmpty(inv_type)) {
                inv_type = 'Service';
            }
            var doc_num = res.getValue({ name: 'tranid' });
            var days_open = res.getValue({ name: 'daysopen' });

            // Create Object
            createSentList(inv_id, doc_num, entityid, companyname, inv_type, tot_am, days_open);

            // Save Invoices - Secondly
            var attachments = [];
            var invFile = getInvoiceFiles(inv_id);
            attachments.push(invFile);
            log.debug({
                title: 'Get Invoice ID Set Files',
                details: invFile // TEST NSW Cust 2 Invoice 3449875 - Amount = $2.20;
            });

            //Send Email
            sendEmail(internalid, companyname, email_address, attachments, doc_num, user_email);

            index++;
            return true;
        });
    }

    function sendEmail(custSet, companyname, email_address, attachments, invoice_number, user_email){
        log.debug({
            title: 'Email Address',
            details: email_address
        })
        var email_template = emailTemplate();
        email.send({
            author: 35031, // Accounts: 35031 | Customer Service: 112209
            body: email_template, // Get Email Template
            subject: 'MailPlus Invoice: ' + invoice_number,
            recipients: ['anesu.chakaingesu@mailplus.com.au'], // | 'ankith.ravindran@mailplus.com.au' | email_address
            // cc: [user_email],
            attachments: attachments,
            // relatedRecords:{
            //     entityId: custSet // Add Email Reminder Notification as Message Under Customer
            // }
        });
        log.debug({
            title: 'Send Out Emails: Attachments and Data',
            details: custSet + companyname + email_address + attachments
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

    function emailTemplate(companyname, email_address){
        var emailMerger = render.mergeEmail({
            templateId: 177, //. Mass Invoice Email Template - 363 | Invoice Email - 177
            entity: null,
            recipient: null,
            supportCaseId: null,
            transactionId: null,
            customRecord: null
        });
        var html_body = emailMerger.body;
        log.debug({
            title: 'Email template',
            details: html_body
        })
        return html_body;
    }

    function createSentList(inv_id, doc_num, entityid, companyname, inv_type, tot_am, days_open) {
        var sentListRec = record.create({
            type: 'customrecord_mass_inv_email_list',
            isDynamic: true,
        });
        sentListRec.setValue({ fieldId: 'name' , value: inv_id });
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_doc_num' , value: doc_num});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_entityid' , value: entityid});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_companyname' , value: companyname});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_inv_type' , value: inv_type});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_tot_am' , value: tot_am});
        sentListRec.setValue({ fieldId: 'custrecord_mass_inv_email_days_open' , value: days_open});
        sentListRec.save();

        return true;
    }

    function deleteSentList(){
        log.debug({ title: 'Deleting Records' });
        var invRecEmailList = search.load({
            id: 'customsearch_mass_inv_email_list_2',
            type: 'customrecord_mass_inv_email_list'
        });
        invRecEmailList.run().each(function(res){
            record.delete({
                type: 'customrecord_mass_inv_email_list',
                id: res.getValue({ name: 'internalid' })
            });
            return true;
        });
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