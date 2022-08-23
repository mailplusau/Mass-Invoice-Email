/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * 
 * Module Description
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
         var user_email = ctx.getParameter({ name: 'custscript_ss_serv_debt_user_email'});
         var selectedCustSet = new Array();
         selectedCustSet = JSON.parse(JSON.stringify(ctx.getParameter({ name: 'custscript_ss_serv_debt_cust_id'})));
         // selectedCustSet = [630601, 630604] // TEST
         log.debug({
             title: 'Executed Order 66',
             details: selectedCustSet
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
         var zee_id = ctx.getParameter({ name: 'custscript_ss_serv_debt_zee_id'});
         var term_id = ctx.getParameter({ name: 'custscript_ss_serv_debt_term_id'});
         var user_id = ctx.getParameter({ name: 'custscript_ss_serv_debt_user_id'});
         var days_open_filter = ctx.getParameter({ name: 'custscript_ss_serv_debt_days_open_filter'});
 
         // Make Result Set Bigger.
         var main_index = 0;
         var custResultSet = [];
 
         // Search
         var custSearch = search.load({ type: 'customer', id: 'customsearch_cust_term' });
         if (!isNullorEmpty(selectedCustSet)){
             // log.debug({
             //     title: 'Type Of',
             //     details: typeof selectedCustSet
             // });
             if (selectedCustSet.length > 1){
                 selectedCustSet = selectedCustSet.split("\u0005") // Remove NetSuite Random Space Thingo.
                 log.debug({
                     title: 'Split Cust Set',
                     details: selectedCustSet
                 });
             }
             custSearch.filters.push(search.createFilter({
                 name: 'internalid',
                 operator: search.Operator.ANYOF,
                 values: selectedCustSet // cust_id
             }));
             custSearch.filters.push(search.createFilter({
                 name: 'partner',
                 operator: search.Operator.IS,
                 values: zee_id
             }));
             if (!isNullorEmpty(term_id) && parseInt(term_id) != 0){
                 custSearch.filters.push(search.createFilter({
                     name: 'terms',
                     operator: search.Operator.ANYOF,
                     values: term_id
                 }));
             }
             custSearch.filters.push(search.createFilter({
                 name: 'email',
                 operator: search.Operator.ISNOTEMPTY,
                 values: null
             }));
             // Days Open
             custSearch.filters.push(search.createFilter({
                 name: 'daysopen',
                 join: 'transaction',
                 operator: search.Operator.GREATERTHAN,
                 values: days_open_filter
             }));
         } else { // If Customer ID is Empty, and no filters Selected. | Automate.
             log.debug({
                 title: 'Automated Emails'
             });
             // custSearch.filters.push(search.createFilter({
             //     name: 'internalid',
             //     operator: search.Operator.ANYOF,
             //     values: selectedCustSet // cust_id
             // }));
             // custSearch.filters.push(search.createFilter({
             //     name: 'partner',
             //     operator: search.Operator.IS,
             //     values: zee_id
             // }));
             // custSearch.filters.push(search.createFilter({
             //     name: 'terms',
             //     operator: search.Operator.ANYOF,
             //     values: term_id
             // }));
             // custSearch.filters.push(search.createFilter({
             //     name: 'daysopen',
             //     join: 'transaction',
             //     operator: search.Operator.GREATERTHAN,
             //     values: days_open_filter
             // }));
             custSearch.filters.push(search.createFilter({
                 name: 'email',
                 operator: search.Operator.ISNOTEMPTY,
                 values: null
             }));
         }
         
         var custSearchRes = custSearch.run(); // Search Result
         var customerSearchResLength = custSearch.runPaged().count;
         log.debug({
             title: 'Search Length',
             details: customerSearchResLength
         });
         // for (var main_index = 0; main_index < 10000; main_index += 1000) {
         //     custResultSet.push(custSearchRes.getRange({ start: main_index, end: main_index + 999 }));
         // }
         // Search Variables
         var invoiceIdSet = [];
         var custIdSet = [];
         var compNameSet = [];
 
         var emailSet  = [];
         var emailName = [];
 
         var custIndex = 0;
         custSearchRes.each(function(res){
             // Customer Details
             var internalid = res.getValue({ name: "internalid", summary: "GROUP" });
             var companyname = res.getValue({ name: 'companyname', summary: search.Summary.GROUP });
             if (custIdSet.indexOf(internalid) == -1){
                 custIdSet.push(internalid)
                 compNameSet.push(companyname);
             }
             var email_address = res.getValue({ name: 'email', summary: search.Summary.GROUP });
             if (custIndex == 0){
                 emailName.push(email_address);
             }
             
             // Invoice Details
             var inv_id = res.getValue({ name: 'internalid', join: 'transaction', summary: search.Summary.GROUP });
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
             custSet.forEach(function(id){
                 // Service Debtors Email Record
                 var servDebtEmail = record.create({ type: 'customrecord_serv_debt_email' });
                 servDebtEmail.setValue({ fieldId: 'name', value: id }); //  Customer ID
                 servDebtEmail.setValue({ fieldId: 'custrecord_serv_debt_email_note', value: 'Missed Payment Reminder Email Sent' });
                 servDebtEmail.setValue({ fieldId: 'custrecord_serv_debt_email_auth_id', value: user_id }); // Author - user_id | 35031 = Accounts
                 servDebtEmail.setValue({ fieldId: 'custrecord_serv_debt_email_cust_id', value: id }); // Customer ID
                 servDebtEmail.setValue({ fieldId: 'custrecord_serv_debt_email_zee_id', value: zee_id }); 
                 var today_date_formatted = format.parse({ value: today_date, type: format.Type.DATE });
                 servDebtEmail.setValue({ fieldId: 'custrecord_serv_debt_email_date', value: today_date_formatted }); // Date
                 servDebtEmail.save();
 
                 var statementFile = createStatementFile(id);
                 log.debug({
                     title: 'Statement File',
                     details: statementFile // TEST NSW Cust 2 Invoice 3449875 - Amount = $2.20;
                 });
                 attachments.push(statementFile);
 
                 // Set Customer Invocie as Viewed.
                 var filter = search.createFilter({
                     name: 'custrecord_debt_coll_inv_cust_id',
                     operator: search.Operator.IS,
                     values: id
                 });
                 var searchViewed = search.load({
                     id: 'customsearch_debt_coll_table',
                     type: 'customrecord_debt_coll_inv',
                     filters: filter
                 });
                 searchViewed.run().each(function(res) {
                     var internalRecordID = res.getValue({
                         name: 'internalid'
                     });
                     var snoozeInvoice = record.load({
                         type: 'customrecord_debt_coll_inv',
                         id: internalRecordID
                     });
                     snoozeInvoice.setValue({
                         fieldId: 'custrecord_debt_coll_viewed',
                         value: true
                     });
                     snoozeInvoice.save();
                 }); 
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
         // }
     }
 
     function sendEmail(custSet, company_name, email_address, attachments, user_email){
         log.debug({
             title: 'Email ADdress',
             details: email_address
         })
         var email_template = emailTemplate();
         email.send({
             author: 35031, // Accounts: 35031 | Customer Service: 112209
             body: email_template, // Get Email Template
             subject: 'Missed Payment Reminder',
             recipients: ['anesu.chakaingesu@mailplus.com.au'], // | 'ankith.ravindran@mailplus.com.au' | email_address
             cc: [user_email],
             attachments: attachments,
             // relatedRecords:{
             //     entityId: custSet // Add Email Reminder Notification as Message Under Customer
             // }
         });
         log.debug({
             title: 'Send Out Emails'
         });
         log.debug({
             title: 'Send Out Emails: Attachments and Data',
             details: custSet + company_name + email_address + attachments + user_email
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
 
     function createStatementFile(cust_id){
         var transactionFile = render.statement({
             entityId: parseInt(cust_id), // TEST - parseInt(cust_id)
             printMode: render.PrintMode.PDF,
             statementDate: today_date,
             consolidateStatements: true,
             openTransactions: true,
             // inCustLocale: true
         });
         return transactionFile;
     }
 
     function emailTemplate(companyname, email_address){
         var emailMerger = render.mergeEmail({
             templateId: 359,
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
         // return '<html><body><p1><strong>Dear Customer,</strong><br><br>This is a reminder that your account is now past due per the above balance. Please arrange payment as soon as possible.<br><br>If you require copies of invoices, please view attached.<br><br><a href="https://www.bpoint.com.au/pay/mailplus">Pay my invoice</a><br><br>Thank you for your prompt attention to this matter.<br><br>Sincerly,<br>MailPlus Accounts Team<br>Email: <a href="mailto:accounts@mailplus.com.au">accounts@mailplus.com.au</a></p1></body></html>';
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