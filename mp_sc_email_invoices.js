/**
 * @author mmasiello
 * 
 * $id:$
 * 
 * include :    mp_lib.js
 */


/**
 * Search through the passed parameter list of internal ids. For each entry;
 * 1. send an email.
 * 2. update the Invoice Emailed Date and Invoice Emailed flag.
 * 
 * Ensure that governance issues are catered to.
 */
function main() {
    try {
        // Retrieve passed invoices and split it into an array.
        // Create a reference array. This will be used to hold the remainder of the 'to be processed' invoices.
        var strInvoices = nlapiGetContext().getSetting('script', 'custscript_sc_invoice_emails');
        var aInvoices = strInvoices.split(',');
        var aToBeProcessed = strInvoices.split(',');

        nlapiLogExecution('debug', 'Email invoice', 'Scheduled email invoices : ' + strInvoices + '. Array length : ' + (isNullorEmpty(aInvoices) ? 0 : aInvoices.length));

        // Ensure that there are entries available for procesing.
        if (!isNullorEmpty(strInvoices) && strInvoices.length > 0) {
            // Process the string.
            var aToBeProcessed = processInvoiceEmails(aInvoices, aToBeProcessed);

            // If governance has been reached, reschedule job.
            if (governanceReached()) {
                // Establish a string of To Be Processed invoices.
                strInvoices = aToBeProcessed.toString();

                // Define parameters to be passed to the scheduled script.
                var scheduleParams = new Array();
                scheduleParams['custscript_sc_invoice_emails'] = strInvoices;

                // Schedule the mass invoice email.
                var context = nlapiGetContext();

                var rtnSchedule = nlapiScheduleScript(context.getScriptId(), context.getDeploymentId(), scheduleParams);
                nlapiLogExecution('debug', 'Email invoice', 'Scheduling email invoicing processing. The schedule is : ' + rtnSchedule);
            }
        }
    } catch (ex) {
        errorStr = (ex instanceof nlobjError) ? ex.getCode() + '\n' + ex.getDetails() + '\n' + ex.getStackTrace() : ex.toString();
        nlapiLogExecution('error', 'Email invoice', 'Error emailing invoices : ' + errorStr);
    }
}


/**
 * Process past invoices.
 * 
 * @param {Object} strInvoices
 */
function processInvoiceEmails(aInvoices, aToBeProcessed) {
    // Use a saved search to retieve all required invoice details. This will save on governance and the overall DB hit.
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('internalid', '', 'anyof', aInvoices);
    var invoiceResults = nlapiSearchRecord('transaction', 'customsearch_invoice_mass_email', filters, null);

    // Get the Author for any email to be sent.
    var emailSender = nlapiGetContext().getSetting('SCRIPT', 'custscript_email_author');

    nlapiLogExecution('debug', 'Email invoice', 'Array size : ' + aInvoices.length + '. Saved Search Entries : ' + (!isNullorEmpty(invoiceResults) ? invoiceResults.length : 0));

    // Move through all invoices. 
    for (var i = 0; !isNullorEmpty(invoiceResults) && !governanceReached() && !isNullorEmpty(aInvoices) && i < aInvoices.length; i++) {
        // Retrieve the corresponding saved search entry.
        var invoiceDetail = getInvoiceDetail(aInvoices[i], invoiceResults);

        // Email the invoice.
        if (!isNullorEmpty(invoiceDetail) && emailInvoice(aInvoices[i], invoiceDetail, emailSender)) {
            // Update the Invoice Emailed Date and Invoice Emailed flag.
            nlapiSubmitField('invoice', aInvoices[i], ['custbody_invoice_emailed_date', 'custbody_invoice_emailed'], [nlapiDateToString(new Date()), 'T']);
            nlapiLogExecution('debug', 'Email invoice', 'Invoice updated : ' + aInvoices[i]);
        }

        // Remove the first element from the array.
        aToBeProcessed.splice(0, 1);

        nlapiLogExecution('debug', 'Email invoice', 'Selected invoices : ' + aInvoices.toString() + '. To be processed invoices : ' + aToBeProcessed.toString());
    }

    return aToBeProcessed;
}


/**
 * Email the invoice.
 * 
 * @param {Object} recId
 * @param {Object} invoiceDetail
 */
function emailInvoice(recId, invoiceDetail, emailSender) {
    // Return true/false based on whether a email is sent.
    var lReturn = false;

    try {
        // Establish the senders id.
        //var emailSender = nlapiGetUser();

        // Establish the recipiant. (Note that this can either be the internal id or email address.)
        var emailCustomer = invoiceDetail.getValue('entity');
        var mpexUsageReport = invoiceDetail.getValue('custbody_mpex_usage_report');

        nlapiLogExecution('debug', 'mpexUsageReport', mpexUsageReport);

        // var emailCCEmail = invoiceDetail.getValue('custentity_alt_invoicing_email_address', 'customer');
        var customer_id = invoiceDetail.getValue('internalid', 'customer');
        // var emailCCEmail = isNullorEmpty(emailCCEmail) ? null : '[' +emailCCEmail;

        var custRec = nlapiLoadRecord('customer', customer_id);
        var emailCCEmail = custRec.getFieldValue('custentity_accounts_cc_email');
        var partnerId = custRec.getFieldValue('partner');
        if (!isNullorEmpty(emailCCEmail)) {
            var emailCCArray = emailCCEmail.split(',');
        } else {
            var emailCCArray = null;
        }


        nlapiLogExecution('debug', 'Email invoice', 'Customer CC : ' + emailCCEmail);
        nlapiLogExecution('debug', 'Email invoice', 'Customer CC : ' + emailCCArray);

        // Set Template to be used for mail merge.
        var mergeResult = nlapiCreateEmailMerger(177).merge();
        //var mergeResult = nlapiCreateEmailMerger(315).merge();

        // Determine the subject and body.
        var emailBody = mergeResult.getBody();

        // email subject not declared in template due to other uses. Need to manually set.
        var emailSubject = 'Mail Plus Invoice : ' + invoiceDetail.getValue('number');

        // var emailBody = 'Dear ' + invoiceDetail.getValue('altname', 'customer') + ', \n\n' +
        //     'Please find attached your current Mail Plus Invoice. \n' +
        //     'If you have any questions please reply to this email or contact our Accounts Department on 1300 65 65 95. \n\n' +
        //     'Regards \n\n' +
        //     'Mail Plus Accounts Department';


        // Attach the email to both the invoice and the customer.
        var emailAttach = new Object();
        emailAttach['transaction'] = recId;
        emailAttach['entity'] = invoiceDetail.getValue('entity');

        // Retrieve the file to be emailed.
        var emailFile = nlapiPrintRecord('TRANSACTION', recId, 'PDF', null);

        arrAttachments = [];

        arrAttachments.push(nlapiPrintRecord('TRANSACTION', recId, 'PDF', null));
        if (!isNullorEmpty(mpexUsageReport)) {
            arrAttachments.push(nlapiLoadFile(parseInt(mpexUsageReport)));
        }
        if (partnerId == 1760249 || partnerId == '1760249') {
            arrAttachments.push(nlapiLoadFile(parseInt(6415837)));
        }
        // arrAttachments.push(nlapiLoadFile(parseInt(6013021)));

        nlapiLogExecution('debug', 'Email invoice', 'Customer : ' + recId + '. Email created : ' + !isNullorEmpty(emailFile));

        // Send an email only if the file is available.
        if (!isNullorEmpty(emailFile)) {
            //nlapiSendEmail(emailSender, emailCustomer, emailSubject, emailBody, emailCCEmail, null, emailAttach, emailFile);
            nlapiSendEmail(emailSender, emailCustomer, emailSubject, emailBody, emailCCArray, null, emailAttach, arrAttachments);
            lReturn = true;

            nlapiLogExecution('debug', 'Email invoice', 'Email Sent : ' + recId);
        }
    } catch (ex) {
        errorStr = (ex instanceof nlobjError) ? ex.getCode() + '\n' + ex.getDetails() + '\n' + ex.getStackTrace() : ex.toString();
        nlapiLogExecution('error', 'Email invoice', 'Error in emailing invoice : ' + errorStr);
    }

    return lReturn
}


/**
 * Returns the matching invoice details.
 * 
 * @param {Object} recId
 * @param {Object} invoiceResults
 */
function getInvoiceDetail(recId, invoiceResults) {
    var invoiceDetail = null;

    // Loop through the saved search exiting when a result (match) is found.
    for (var x = 0; isNullorEmpty(invoiceDetail) && x < invoiceResults.length; x++) {
        // Check for a match.
        if (invoiceResults[x].getValue('internalid') == recId) {
            // Save and return the invoice detail.
            invoiceDetail = invoiceResults[x];
            nlapiLogExecution('debug', 'Email invoice', 'Invoice Match. Current Record : ' + recId + '. Search internal id : ' + invoiceResults[x].getValue('internalid'));
        }
    }

    return invoiceDetail;
}