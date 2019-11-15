/**
 * @author mmasiello
 * 
 * $id:$
 * 
 * include :    mp_lib.js
 */


/**
 * Allow for the selection invoices for mass emailing based on the entry of (either or) franchisee, custom and transaction date range.
 * 
 * @param {Object} request
 * @param {Object} response
 */
function main(request, response) {
    nlapiLogExecution('debug', 'Email invoice', 'Email invoice selection');

    // Ensure that if you're refreshing the page, that header details are set.
    var lRefreshPage = request.getParameter('custpage_refresh_page') != null ? request.getParameter('custpage_refresh_page') : 'F';

    // If we are not refreshing the page then either it's the first entry into the page or, if items have been selected, we are about to schedule the email facility.
    if (lRefreshPage != 'T') {
        // Check to establish whether there are any items.
        var nlineCount = (request.getLineItemCount('custpage_invoice_sublist') != null) ? request.getLineItemCount('custpage_invoice_sublist') : 0;

        // Create a string based of the lines being marked for processing.
        var strInvoices = nlineCount > 0 ? stringSelectedItems(request) : 0;

        // If invoices have been marked - kick off the scheduled process then allow the form to be redisplayed.
        if (!isNullorEmpty(strInvoices)) {
            // Define parameters to be passed to the scheduled script.
            var scheduleParams = new Array();
            scheduleParams['custscript_sc_invoice_emails'] = strInvoices;

            // Schedule the mass invoice email.
            var rtnSchedule = nlapiScheduleScript('customscript_sc_invoice_emails', null, scheduleParams);
            nlapiLogExecution('debug', 'Email invoice', 'Scheduling email invoicing processing. The schedule is : ' + rtnSchedule);

            // Redirect the user to the invoice selection.
            nlapiSetRedirectURL('TASKLINK', 'LIST_TRAN_CUSTINVC');
        }
    }

    // build and render the form to the screen.
    var form = displayForm(request, lRefreshPage);
    response.writePage(form);
}


/**
 * Display the form.
 * 
 * @param {Object} request
 * @param {Object} lRefreshPage
 */
function displayForm(request, lRefreshPage) {
    // Ensure that header details are re-entered if you're refreshing the page.
    var strFranchisee = (lRefreshPage == 'T' && request.getParameter('custpage_franchisee') != null) ? request.getParameter('custpage_franchisee') : '';
    var strCustomer = (lRefreshPage == 'T' && request.getParameter('custpage_customer') != null) ? request.getParameter('custpage_customer') : '';
    var strPostPeriod = (lRefreshPage == 'T' && request.getParameter('custpage_period') != null) ? request.getParameter('custpage_period') : '';
    var strAccount = (lRefreshPage == 'T' && request.getParameter('custpage_account') != null) ? request.getParameter('custpage_account') : '';
    var strCreateDateFrom = (lRefreshPage == 'T' && request.getParameter('custpage_createdatefrom') != null) ? request.getParameter('custpage_createdatefrom') : '';
    var strCreateDateTo = (lRefreshPage == 'T' && request.getParameter('custpage_createdateto') != null) ? request.getParameter('custpage_createdateto') : '';
    var strDueDateFrom = (lRefreshPage == 'T' && request.getParameter('custpage_duedatefrom') != null) ? request.getParameter('custpage_duedatefrom') : '';
    var strDueDateTo = (lRefreshPage == 'T' && request.getParameter('custpage_duedateto') != null) ? request.getParameter('custpage_duedateto') : '';
    var strInvType = (lRefreshPage == 'T' && request.getParameter('custpage_invtype') != null) ? request.getParameter('custpage_invtype') : '';
    var strInvMtd = (lRefreshPage == 'T' && request.getParameter('custpage_invmtd') != null) ? request.getParameter('custpage_invmtd') : '';

    // Define the character returned by the multi select to be replaced by a ','.
    //  var strChar5 = String.fromCharCode(5);
    //  strFranchisee = strFranchisee.indexOf(strChar5) != -1 ? strFranchisee.split(strChar5) : strFranchisee;
    //  strCustomer   = strCustomer.indexOf(strChar5)   != -1 ? strCustomer.split(strChar5)   : strCustomer;

    // Create the form.
    var form = nlapiCreateForm('Mass Invoice Email');

    // Client side validation.      
    form.setScript('customscript_cs_invoice_email');

    var fld = form.addField('custpage_franchisee', 'select', 'Franchisee', 'partner');
    fld.setMandatory(false);
    fld.setDefaultValue(strFranchisee);
    fld.setHelpText('If entered, results will be filter by Franchisee.');
    fld.setLayoutType('normal', 'startcol');

    fld = form.addField('custpage_customer', 'select', 'Customer', 'customer');
    fld.setMandatory(false);
    fld.setDefaultValue(strCustomer);
    fld.setHelpText('If entered, results will be filter by Customer.');

    //fld = form.addField('custpage_satchel','checkbox', 'Satchel Invoice');
    //fld.setMandatory(false);
    //fld.setDefaultValue(strSatchel);
    //fld.setHelpText('If checked, results will be filter to satchel invoices only.');

    //fld = form.addField('custpage_invmtd', 'select', 'Invoice Method', 'customlist_invoice_method');
    //fld.setMandatory(false);
    //fld.setDefaultValue(strInvMtd);
    //fld.setHelpText('Select the default invoice distribution method of the invoices you wish to email.');

    fld = form.addField('custpage_account', 'select', 'Account', 'account');
    fld.setMandatory(false);
    fld.setDefaultValue(strAccount);
    fld.setHelpText('Select the type of invoices you wish to send.');

    fld = form.addField('custpage_period', 'select', 'Posting Period', 'accountingperiod');
    fld.setMandatory(false);
    fld.setDefaultValue(strPostPeriod);
    fld.setHelpText('If entered, results will be filter by Posting Period.');
    fld.setLayoutType('normal', 'startcol');

    fld = form.addField('custpage_createdatefrom', 'date', 'Invoice Date From');
    fld.setMandatory(false);
    fld.setDefaultValue(strCreateDateFrom);
    fld.setHelpText('If entered, results will be filtered by invoices created on or after the Date From entered.');

    fld = form.addField('custpage_createdateto', 'date', 'To');
    fld.setMandatory(false);
    fld.setDefaultValue(strCreateDateTo);
    fld.setHelpText('If entered, results will be filtered by invoices created on or before the Date To entered.');

    // Set a page refresh field to be used when any of the above filters have altered.
    fld = form.addField('custpage_refresh_page', 'checkbox', 'Refresh Page');
    fld.setDisplayType('hidden');

    // Add sublist of available invoices based on the filters above.
    getInvoiceLines(form, strFranchisee, strCustomer, strPostPeriod, strCreateDateFrom, strCreateDateTo, strDueDateFrom, strDueDateTo, strAccount /*, strInvType, strInvMtd*/ );

    // Add buttons (Submit and Reset)
    form.addSubmitButton('Submit');
    form.addResetButton();

    return form;
}


/**
 * Display Invoice Lines for selection.
 * 
 * @param {Object} form
 * @param {Object} strFranchisee
 * @param {Object} strCustomer
 * @param {Object} strPostPeriod
 * @param {Object} strCreateDate
 * @param {Object} strDueDateFrom
 * @param {Object} strDueDateTo
 */
function getInvoiceLines(form, strFranchisee, strCustomer, strPostPeriod, strCreateDateFrom, strCreateDateTo, strDueDateFrom, strDueDateTo, strAccount, strInvType, strInvMtd) {
    // Add sublist.
    var sublist = form.addSubList('custpage_invoice_sublist', 'list', 'Select Invoices');

    // Add the select column plus Mark and Unmark columns.
    sublist.addField('custpage_check', 'checkbox', 'Select');
    sublist.addMarkAllButtons();

    // The following are populated from the saved search.
    // Add the internal id - to be used for referencing the selected transaction back to the record.
    var fld = sublist.addField('internalid', 'integer', 'ID');
    fld.setDisplayType('hidden');

    fld = sublist.addField('partner_display', 'text', 'Franchisee');
    fld = sublist.addField('entity_display', 'text', 'Customer');
    fld = sublist.addField('number', 'text', 'Invoice');
    fld = sublist.addField('formulatext', 'text', '');
    fld = sublist.addField('status_display', 'text', 'Status');
    fld = sublist.addField('location_display', 'text', 'Location');
    fld = sublist.addField('postingperiod_display', 'text', 'Posting Period');
    fld = sublist.addField('trandate', 'date', 'Creation Date');
    fld = sublist.addField('duedate', 'date', 'Due Date');
    fld = sublist.addField('amount', 'currency', 'Amount');
    fld = sublist.addField('custbody_inv_type', 'text', 'Invoice Type');

    // Build the required filter.
    var nPos = 0;
    var filters = new Array();

    // Note that the franchisee filter is only used when entered.
    if (!isNullorEmpty(strFranchisee)) {
        filters[nPos++] = new nlobjSearchFilter('partner', null, 'anyof', strFranchisee);
    }

    // Note that the customer filter is only used when entered.
    if (!isNullorEmpty(strCustomer)) {
        filters[nPos++] = new nlobjSearchFilter('entity', null, 'anyof', strCustomer);
    }

    // Note that the posting period filter is only used when entered.
    if (!isNullorEmpty(strPostPeriod)) {
        filters[nPos++] = new nlobjSearchFilter('postingperiod', null, 'anyof', strPostPeriod);
    }

    // Add from create date filters.
    if (!isNullorEmpty(strCreateDateFrom)) {
        filters[nPos++] = new nlobjSearchFilter('trandate', null, 'onorafter', strCreateDateFrom);
    }

    // Add to create date filters.
    if (!isNullorEmpty(strCreateDateTo)) {
        filters[nPos++] = new nlobjSearchFilter('trandate', null, 'onorbefore', strCreateDateTo);
    }

    // Add from due date filters.
    if (!isNullorEmpty(strDueDateFrom)) {
        filters[nPos++] = new nlobjSearchFilter('duedate', null, 'onorafter', strDueDateFrom);
    }

    // Add To due date filter.
    if (!isNullorEmpty(strDueDateTo)) {
        filters[nPos++] = new nlobjSearchFilter('duedate', null, 'onorbefore', strDueDateTo);
    }

    // Add satchel filter.
    if (!isNullorEmpty(strAccount)) {
       filters[nPos++] = new nlobjSearchFilter('account', null, 'anyof', strAccount);
    }

    // Add invoice distribution method filter.
    // if (!isNullorEmpty(strInvMtd)) {
    //    filters[nPos++] = new nlobjSearchFilter('customer.custentity_invoice_method', null, 'anyof', strInvMtd);
    // }

    // Create search with which to populate the Sublist
        var columns = new Array();
        columns[0] = new nlobjSearchColumn('internalid');
        columns[1] = new nlobjSearchColumn('partner');
        columns[2] = new nlobjSearchColumn('entity');
        columns[3] = new nlobjSearchColumn('number');
        columns[4] = new nlobjSearchColumn('formulatext');
        columns[5] = new nlobjSearchColumn('status');
        columns[6] = new nlobjSearchColumn('location');
        columns[7] = new nlobjSearchColumn('postingperiod');
        columns[8] = new nlobjSearchColumn('trandate');
        columns[9] = new nlobjSearchColumn('duedate');
        columns[10] = new nlobjSearchColumn('amount');
        columns[11] = new nlobjSearchColumn('custbody_inv_type');

    // Populate the sublist from the search.
    var searchResults = nlapiSearchRecord('transaction', 'customsearch_invoice_mass_email', filters, columns);
    sublist.setLineItemValues(searchResults);

    return true;
}


/**
 * String the selected items returning the result to the calling function.
 * 
 * @param {Object} request
 */
function stringSelectedItems(request) {
    var strInvoices = '';

    // Loop through available lines.
    for (var i = 1; i <= request.getLineItemCount('custpage_invoice_sublist'); i++) {
        // Only process selected invoices.
        if (request.getLineItemValue('custpage_invoice_sublist', 'custpage_check', i) == 'T') {
            // Update the string. Ensure that a new line delimiter is added if required. 
            strInvoices = (strInvoices.length > 0) ? strInvoices + ',' : strInvoices;
            strInvoices += request.getLineItemValue('custpage_invoice_sublist', 'internalid', i);
        }
    }

    nlapiLogExecution('debug', 'Email invoice', 'Total Invoices to be processed : ' + strInvoices);

    return strInvoices;
}