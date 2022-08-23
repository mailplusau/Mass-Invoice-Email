/**
 * 
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * 
 *  * NSVersion    Date                        Author         
 *  * 2.00         22022-08-15 09:33:08        Anesu
 * 
 * Description: Mass Invoice Email
 *
 * @Last Modified by: Anesu Chakaingesu
 * @Last Modified time: 2022-08-15 09:33:08 
 * 
 */

define(['N/error', 'N/runtime', 'N/search', 'N/url', 'N/record', 'N/format', 'N/email', 'N/currentRecord'],
function (error, runtime, search, url, record, format, email, currentRecord) {
    var baseURL = 'https://1048144.app.netsuite.com';
    if (runtime.envType == "SANDBOX") {
        baseURL = 'https://1048144-sb3.app.netsuite.com';
    }
    var role = runtime.getCurrentUser().role;
    var user_id = runtime.getCurrentUser().id;
    var user_email = runtime.getCurrentUser().email;
    // console.log(user_email);

    var currRec = currentRecord.get();
    var ctx = runtime.getCurrentScript();

    var dataSet = [];
    var zeeSet = [];

    

    // Date Today n Date Tomorrow
    var today_date = new Date(); // Test Time 6:00pm - '2022-06-29T18:20:00.000+10:00'
    today_date.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
    today_date = dateISOToNetsuite(today_date);
    today_date = format.parse({ value: today_date, type: format.Type.DATE });
    // console.log(today_date);

    /**
     * On page initialisation
     */
    function pageInit() {
        // Background-Colors
        $("#NS_MENU_ID0-item0").css("background-color", "#CFE0CE");
        $("#NS_MENU_ID0-item0 a").css("background-color", "#CFE0CE");
        $("#body").css("background-color", "#CFE0CE");

        // Hide/UnHide Elements
        $('.loading_section').hide();
        $('#submit').removeClass('hide');

        // // Hide Netsuite Submit Button
        $('#submitter').css("background-color", "#CFE0CE");
        $('#submitter').hide();
        $('#tbl_submitter').hide();

        loadZeeList();

        var dataTable = $("#data_preview").DataTable({
            data: dataSet,
            // pageLength: 100,
            // autoWidth: false,
            order: [2, 'asc'], // Company Name
            columns: [ 
                { title: 'Selector' },// 0
                { title: 'Franchisee ID' },// 1
                { title: "Date Submitted" }, // 2
                { title: "Name" }, // 3
                { title: "State" }, // 4
                { title: 'No. of Invoices' }, // 5
            ],
            
            columnDefs: [
            ],
            rowCallback: function(row, data) {
            //  if ($(row).hasClass('odd')) {
            //      $(row).css('background-color', 'rgba(250, 250, 210, 1)'); // LightGoldenRodYellow
            //  } else {
            //      $(row).css('background-color', 'rgba(255, 255, 240, 1)'); // Ivory
            //  }
            //  if (!isNullorEmpty(data[7])){ // Date Emailed
            //      if ($(row).hasClass('odd')) {
            //          $(row).css('background-color', 'rgba(51, 204, 255, 0.65)'); // Lighter Blue / Baby Blue
            //      } else {
            //          $(row).css('background-color', 'rgba(78, 175, 214, 0.65)'); // Darker Blue
            //      }
            //  }
            }
        });

        // Toggle Customer In List
        $(document).on('click', '.zee-include', function(){
            var zeeId = $(this).attr('zee-id');

            $(this).parent().css('background-color', 'rgba(144, 238, 144, 0.75)'); // Green

            if ($(this).hasClass('active')){ // Active
                if (zeeSet.indexOf(zeeId) == -1){
                    zeeSet.push(zeeId);
                }
            } else { // Not Active
                const zeeIndex = zeeSet.indexOf(zeeId);
                if (zeeIndex > -1){
                    zeeSet.splice(zeeIndex, 1);
                    $(this).css('background-color', '')
                }   
            }
            console.log(zeeSet)
        })

        $('#submit').click(function(){
            console.log('On Click : Cust Length ' + zeeSet.length);
            if (zeeSet.length > 0) {
                // Trigger Submit
                $('#submitter').trigger('click');
            } else {
                alert('No Customers Selected');
            }
        })
    }

    function loadZeeList(){
        var openInvoiceList = [];
        var openInvSearch = search.load({ type: 'invoice', id: 'customsearch_mass_inv_email_list' });
        openInvSearch.run().each(function(res){
            var inv_id = res.getValue('internalid');
            var zee_id = res.getValue({ name: 'partner' });
            openInvoiceList.push({invid: inv_id, zeeid: zee_id});
            return true;
        });

        var searchZeeList = search.load({ type: 'task', id: 'customsearch_fr_mthly_inv_complete_3_2' })
        // searchZeeList.filters.push
        searchZeeList.run().each(function(res){
            // var internalid = res.getValue('internalid');
            var date_created = res.getValue({ name: 'createddate' });
            var zee_id = res.getValue({ name: 'assigned' });
            
            var zee = record.load({ type: 'partner', id: zee_id });
            var zee_name = zee.getValue({ fieldId: 'companyname' })
            var zee_state = zee.getText({ fieldId: 'location' })

            var nb_inv_filter = openInvoiceList.filter(function(el){ if (zee_id == el.zeeid){return el} });
            var nb_invoices = nb_inv_filter.length;

            var params = {
                zeeid: parseInt(zee_id)
            };
            params = JSON.stringify(params);
            var upload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_mass_inv_open_list', 'customdeploy_sl_mass_inv_open_list') + '&custparam_params=' + params; //encodeURIComponent(params);
            var inline_link = '<a href=' + upload_url + '>' + nb_invoices + '</a>';        

            dataSet.push([
                '<input class="form-check-input" type="checkbox" zee-id="'+zee_id+'" id="zee-include">',
                zee_id,
                date_created,
                zee_name,
                zee_state,
                inline_link,
                // '<button type="button" class="zee-include btn btn-sm btn-outline-primary" data-toggle="button"  aria-pressed="false">Include Franchisee</button>'
            ])
            return true;
        });

    }

    function saveRecord(context) {
        return true;
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
    
    /**
     * [getDate description] - Get the current date
     * @return {[String]} [description] - return the string date
     */
    function getDate() {
        var date = new Date();
        date = format.format({
            value: date,
            type: format.Type.DATE,
            timezone: format.Timezone.AUSTRALIA_SYDNEY
        });

        return date;
    }
    
    function isNullorEmpty(strVal) {
        return (strVal == null || strVal == '' || strVal == 'null' || strVal == undefined || strVal == 'undefined' || strVal == '- None -');
    }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord
    };
});