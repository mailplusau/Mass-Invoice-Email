/**
 * 
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * 
 *  * NSVersion    Date                        Author         
 *  * 2.00         22022-08-15 09:33:08        Anesu
 * 
 * Description: Service Debtors Page
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

    var zee_id = parseInt(currRec.getValue({ fieldId: 'custpage_mass_inv_open_zee_id' }));
    var zee = record.load({ type: 'partner', id: zee_id });
    var zee_name = zee.getValue({ fieldId: 'companyname' });


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
        $('.back').removeClass('hide');

        // // Hide Netsuite Submit Button
        $('#submitter').css("background-color", "#CFE0CE");
        $('#submitter').hide();
        $('#tbl_submitter').hide();

        console.log('Zee: ' + zee_name + ' ID: ' + zee_id);

        loadZeeList(zee_id);

        var dataTable = $("#data_preview").DataTable({
            data: dataSet,
            pageLength: 100,
            // autoWidth: false,
            order: [3, 'asc'], // Company Name
            columns: [ 
                { title: 'Date' },// 0
                { title: 'Document Number' },// 1
                { title: 'Customer ID' }, // 2
                { title: 'Customer Name' }, // 3
                { title: 'Invoice Type' }, // 4
                { title: 'Total Amount' }, // 5
                { title: 'Days Open' }, // 6
                { title: 'Action' }, // 7
                // { title: '' }, // 8
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
        $(document).on('click', '.edit', function(){
            var inv_id = $(this).attr('id');

            var upload_url = baseURL + '/app/accounting/transactions/custinvc.nl?id=' + inv_id +'&e=T';
            // window.location.href = upload_url;
            window.open(upload_url, '_blank')
        })

        // Toggle Customer In List
        $(document).on('click', '.back', function(){
            var inv_id = $(this).val();

            var upload_url = baseURL + url.resolveScript({
                deploymentId: "customdeploy_sl_mass_inv_email",
                scriptId: "customscript_sl_mass_inv_email",
            });
            window.location.href = upload_url;
        });

        // CSV Export
        $(document).on('click', '#csv-export', function(){
            downloadCsv();
        });

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

    function loadZeeList(zee_id){
        var debtDataSet = [];
        var csvSet = [];

        var searchZeeList = search.load({ type: 'invoice', id: 'customsearch_mass_inv_email_list' }) // Mass Email Selection
        searchZeeList.filters.push(search.createFilter({
            name: 'partner',
            operator: search.Operator.IS,
            values: zee_id
        }));

        searchZeeList.run().each(function(res){
            // var internalid = res.getValue('internalid');
            var date_created = res.getValue({ name: 'createddate' });
            var zee_id = res.getValue({ name: 'assigned' });
            
            var date = res.getValue({ name: 'trandate' });
            var inv_id = res.getValue({ name: 'internalid' });
            var doc_num = res.getValue({ name: 'tranid' });
            var tot_am = '$' + res.getValue({ name: 'amount' });
            // Inv Type
            var inv_type = res.getText({ name: 'custbody_inv_type' });
            if (isNullorEmpty(inv_type)) {
                inv_type = 'Service';
            }
            var days_overdue = res.getValue({ name: 'daysoverdue' });
            var days_open = res.getValue({ name: 'daysopen' });

            // Customer Info
            var customer_number = res.getValue({ name: 'internalid', join: 'customer'});
            var customer_name = res.getValue({ name: 'companyname', join: 'customer'});

            dataSet.push([
                date, // 0
                '<a href="' + baseURL + "/app/accounting/transactions/custinvc.nl?id=" + inv_id + '" target="_blank"><p class="entityid">' + doc_num + '</p></a>', // doc_num, //1 
                customer_number, //2
                customer_name, //3
                inv_type, //4
                tot_am, //5
                days_open,
                // days_overdue, //6
                '<button type="button" class="btn btn-sm btn-primary edit" data-toggle="button" id="'+inv_id+'" aria-pressed="false">EDIT</button>', //7
            ])
            csvSet.push([
                date, // 0
                doc_num, // doc_num, //1 
                customer_number, //2
                customer_name, //3
                inv_type, //4
                tot_am, //5
                days_open //6
            ])
            return true;
        });

        saveCsv(csvSet);
    }

    /**
     * Create the CSV and store it in the hidden field 'custpage_table_csv' as a string.
     * @param {Array} csvSet The `csvSet` created in `loadDatatable()`.
     */
    function saveCsv(csvSet) {
        var headers = ["Date", "Document Number", "Customer ID", "Customer Name", 'Invoice Type', 'Total Amount', 'Days Open']
        headers = headers.join(';'); // .join(', ')
        var csv = headers + "\n";
        csvSet.forEach(function(row) {
            row = row.join(';');
            csv += row;
            csv += "\n";
        });

        var val1 = currentRecord.get();
        val1.setValue({
            fieldId: 'custpage_table_csv',
            value: csv
        });

        return true;
    }

    /**
     * Load the string stored in the hidden field 'custpage_table_csv'.
     * Converts it to a CSV file.
     * Creates a hidden link to download the file and triggers the click of the link.
     */
    function downloadCsv() {
        var val1 = currentRecord.get();
        var csv = val1.getValue({
            fieldId: 'custpage_table_csv',
        });
        var a = document.createElement("a");
        document.body.appendChild(a);
        a.style = "display: none";
        var content_type = 'text/csv';
        var csvFile = new Blob([csv], {
            type: content_type
        });
        var url = window.URL.createObjectURL(csvFile);
        var filename = 'Mass Invoice Email - ' + zee_name + ' - ' + today_date + '.csv';
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
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