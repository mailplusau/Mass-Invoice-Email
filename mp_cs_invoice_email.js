/**
 * @author mmasiello
 * 
 * $id:$
 * 
 * include : 	mp_lib.js
 */

 
 /**
  * Initialise page values.
  * 
  * @param {Object} type
  */
 function pageInit(type)
 {
	// Reset the page refresh flag.
	nlapiSetFieldValue('custpage_refresh_page', 'F', false);
 }
 
 
 /**
  * Refresh the page if a field filter alters.
  * 
  * @param {Object} type
  * @param {Object} name
  * @param {Object} i
  */
 function fieldChanged(type, name, i)
 {
	// Refresh the page if one of the selection criteria has changed.
	if (name == 'custpage_franchisee' ||
		name == 'custpage_customer' ||
		name == 'custpage_period' ||
		name == 'custpage_account' ||
		name == 'custpage_createdatefrom' ||
		name == 'custpage_createdateto' ||
		name == 'custpage_duedatefrom' ||
		name == 'custpage_duedateto' ||
		name == 'custpage_invtype' ||
                name == 'custpage_invmtd') 
	{
		// Set the refresh flag.
		nlapiSetFieldValue('custpage_refresh_page', 'T', false);
		
		// Suppress the alert.
		setWindowChanged(window, false);
		
		// Submit the form.
		document.forms.main_form.submit();
	}
 }
 
 
 /**
  * Validate selected items.
  * 
  * @param {Object} type
  * @param {Object} name
  * @param {Object} i
  */
 function validateField(type, name, i)
 {
	var lReturn = true;
	
	if(	name == 'custpage_createdatefrom' || name == 'custpage_createdateto' || name == 'custpage_duedatefrom' || name == 'custpage_duedateto') 
	{		
		var dateFrom    = isNullorEmpty(nlapiGetFieldValue('custpage_createdatefrom')) ? '' : nlapiStringToDate(nlapiGetFieldValue('custpage_createdatefrom')).getTime();
		var dateTo      = isNullorEmpty(nlapiGetFieldValue('custpage_createdateto'))   ? '' : nlapiStringToDate(nlapiGetFieldValue('custpage_createdateto')).getTime();
		var dateDueFrom = isNullorEmpty(nlapiGetFieldValue('custpage_duedatefrom'))    ? '' : nlapiStringToDate(nlapiGetFieldValue('custpage_duedatefrom')).getTime();
		var dateDueTo   = isNullorEmpty(nlapiGetFieldValue('custpage_duedateto'))      ? '' : nlapiStringToDate(nlapiGetFieldValue('custpage_duedateto')).getTime();
		
		// Check the transaction dates.
		if (!isNullorEmpty(dateFrom) && !isNullorEmpty(dateTo) && dateFrom > dateTo )
		{
			lReturn = false;
		}

		// Check the due dates.
		if ( lReturn && (!isNullorEmpty(dateDueFrom) && !isNullorEmpty(dateDueTo) && dateDueFrom > dateDueTo ))
		{
			lReturn = false;
		}
		
		// Display an alert when necessary.
		if ( !lReturn )
		{
			alert('Please ensure that the From Date is not greater than the To Date.')
		}
	}
	
	return lReturn; 
 }