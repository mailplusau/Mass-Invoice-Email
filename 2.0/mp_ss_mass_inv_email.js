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
         *  
         *  Get Array of Customer IDs Requiring Term Email.
         * 
         *  Push Customer As Filter on Customer Financial Terms Search
         *      Sorted By Email First, Then Customer ID
         * 
         *  {
         *      Get Invoices Associated with Customer.
         *      Create Statement from All Invoices Listed. 
         *  }
         */
        // Make Result Set Bigger.
        var main_index = 0;
        var custResultSet = [];

        // Search
        var zeeSearch = search.load({ type: 'invoice', id: 'customsearch_mass_inv_email_list' });
        if (!isNullorEmpty(selectedZeeSet)){
            log.debug({
                title: 'Type Of',
                details: typeof selectedZeeSet
            });
            if (selectedZeeSet.length > 1){
                selectedZeeSet = selectedZeeSet.split("\u0005") // Remove NetSuite Random Space Thingo.
                log.debug({
                    title: 'Split Zee Set',
                    details: selectedZeeSet
                });
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
        var customerSearchResLength = zeeSearch.runPaged().count;
        log.debug({
            title: 'Search Length',
            details: customerSearchResLength
        });
        // for (var main_index = 0; main_index < 10000; main_index += 1000) {
        //     custResultSet.push(zeeSearchRes.getRange({ start: main_index, end: main_index + 999 }));
        // }
        // Search Variables
        var invoiceIdSet = [];
        var custIdSet = [];
        var compNameSet = [];

        var emailSet  = [];
        var emailName = [];

        var custIndex = 0;
        zeeSearchRes.each(function(res){
            // Customer Details
            var internalid = res.getValue({ name: "internalid", join: 'customer' });
            var companyname = res.getValue({ name: 'companyname', join: 'customer'  });
            if (custIdSet.indexOf(internalid) == -1){
                custIdSet.push(internalid)
                compNameSet.push(companyname);
            }
            var email_address = res.getValue({ name: 'email', join: 'customer'  });
            if (custIndex == 0){
                emailName.push(email_address);
            }
            
            // Invoice Details
            var inv_id = res.getValue({ name: 'internalid' });
            invoiceIdSet.push(inv_id);

            if (emailName.indexOf(email_address) == -1 || custIndex == (customerSearchResLength-1)){ // (custIdSet.indexOf(internalid) != -1 &&
                var tempInvIdSet = invoiceIdSet;
                if (custIndex != (customerSearchResLength-1)){
                    tempInvIdSet.pop();
                }

                var tempCustIdSet = custIdSet;
                var tempCompName = compNameSet;
                if (tempCustIdSet.length > 1){
                    tempCustIdSet.pop();
                    tempCompName.pop();
                }

                var tempEmail = emailName[emailName.length-1];
                
                emailSet.push({custSet: tempCustIdSet, compname: tempCompName, email: tempEmail, invSet: tempInvIdSet});
                
                emailName.push(email_address);
                custIdSet = [internalid];
                compNameSet = [companyname];
                invoiceIdSet = [inv_id];
            }
            custIndex++;

            return true;
        });


        // Set Task to Completed
        /* 
        *   Date Completed
            Status to Completed
        */
        
        log.debug({
            title: 'emailSet',
            details: emailSet
        });
        emailSet.forEach(function(custRes){
            var email_address = custRes.email; // Email Address
            var company_name = custRes.compname; // Company Name

            var attachments = []; // Save Attachment Files to Array.

            // Save Statement - First
            var custSet = custRes.custSet;
            log.debug({
                title: 'Get Customer ID',
                details: custSet
            });

            // Save Invoices - Secondly
            var invIdSet = custRes.invSet; 
            log.debug({
                title: 'Get Invoice ID Set Files',
                details: invIdSet // TEST NSW Cust 2 Invoice 3449875 - Amount = $2.20;
            });
            invIdSet.forEach(function(id){
                var invFile = getInvoiceFiles(id);
                attachments.push(invFile);
            });
            
            log.debug({
                title: 'Get Attachment Data',
                details: attachments
            });
            sendEmail(custSet[0], company_name, email_address, attachments, user_email) // Send Email.
        })
    }

    function sendEmail(custSet, company_name, email_address, attachments, user_email){
        log.debug({
            title: 'Email Address',
            details: email_address
        })
        var email_template = emailTemplate();
        email.send({
            author: 35031, // Accounts: 35031 | Customer Service: 112209
            body: email_template, // Get Email Template
            subject: 'Invoice Available',
            recipients: ['anesu.chakaingesu@mailplus.com.au'], // | 'ankith.ravindran@mailplus.com.au' | email_address
            cc: [user_email],
            attachments: attachments,
            // relatedRecords:{
            //     entityId: custSet // Add Email Reminder Notification as Message Under Customer
            // }
        });
        log.debug({
            title: 'Send Out Emails: Attachments and Data',
            details: custSet + company_name + email_address + attachments
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
            templateId: 363, //. Mass Invoice Email Template
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