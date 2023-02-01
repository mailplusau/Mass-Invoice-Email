/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
 * 
 * Module Description
 * 
 * NSVersion    Date                        Author         
 * 2.00         2021-09-20 09:33:08         Anesu
 *
 * Description: Mass Invoice Email
 * 
 * @Last Modified by:   Anesu Chakaingesu
 * @Last Modified time: 2022-07-05 09:33:08
 * 
 */

 define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/task', 'N/format', 'N/currentRecord', 'N/render'],
 function(ui, email, runtime, search, record, http, log, redirect, task, format, currentRecord, render) {
    var zee = 0;
    var role = 0;

    var baseURL = 'https://1048144.app.netsuite.com';
    if (runtime.envType == "SANDBOX") {
        baseURL = 'https://1048144-sb3.app.netsuite.com';
    }

    role = runtime.getCurrentUser().role;

    if (role == 1000) {
        zee = runtime.getCurrentUser().id;
    } else if (role == 3) { //Administrator
        zee = 6; //test
    } else if (role == 1032) { // System Support
        zee = 425904; //test-AR
    }

    function onRequest(context) {
        if (context.request.method === 'GET') {
            var is_params = 'T';
            type = context.request.parameters.type;

            var zee_id = 0;

            var params_params = context.request.parameters;
            if (!isNullorEmpty(params_params.custparam_params)) {
                var params = JSON.parse(context.request.parameters.custparam_params);
                var zee_id = parseInt(params.zeeid);
            }

            var zee = record.load({ type: 'partner', id: zee_id });
            var zee_name = zee.getValue('companyname');

            var form = ui.createForm({ title: ' ' });

            // Load jQuery
            var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';
            // Load Tooltip
            inlineHtml += '<script src="https://unpkg.com/@popperjs/core@2"></script>';

            // Load Bootstrap
            inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
            inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';
            // New Boostrap
            // inlineHtml += '<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">'
            // inlineHtml += '<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>'

            // Load DataTables
            // inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
            inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.12.0/css/jquery.dataTables.min.css">';
            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';

            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/rowgroup/1.1.3/js/dataTables.rowGroup.min.js"></script> '
            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/dataTables.buttons.min.js"></script> '
            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script> '
            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/pdfmake.min.js"></script> '
            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.53/vfs_fonts.js"></script> '
            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/buttons.html5.min.js"></script> '
            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/buttons/2.0.0/js/buttons.print.min.js"></script> '

            // Load Bootstrap-Select
            inlineHtml += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">';
            inlineHtml += '<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>';

            // Load Netsuite stylesheet and script
            inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
            inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
            inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
            inlineHtml += '<style>.mandatory{color:red;}</style>';

            // New Website Color Schemes
            // Main Color: #379E8F
            // Background Color: #CFE0CE
            // Button Color: #FBEA51
            // Text Color: #103D39

            // inlineHtml += '<div class="a" style="width: 100%; background-color: #CFE0CE; padding: 20px; min-height: 100vh; height: 100%; ">'; // margin-top: -40px
            // inlineHtml += '<h1 style="text-align: center; color: #103D39; display: inline-block; font-size: 22px; font-weight: bold; line-height: 33px; vertical-align: top; margin-bottom: 4px;">Service Debtors Email Automation</h1>';
            inlineHtml += '<style>.nav > li.active > a, .nav > li.active > a:focus, .nav > li.active > a:hover { background-color: #379E8F; color: #fff }';
            inlineHtml += '.nav > li > a, .nav > li > a:focus, .nav > li > a:hover { margin-left: 5px; margin-right: 5px; border: 2px solid #379E8F; color: #379E8F; }';
            inlineHtml += '</style>';

            // Define alert window.
            inlineHtml += '<div class="container" style="margin-top:14px;" hidden><div id="alert" class="alert alert-danger fade in"></div></div>';

            // Define information window.
            inlineHtml += '<div class="container" hidden><p id="info" class="alert alert-info"></p></div>';
            inlineHtml += '<div style="margin-top: -40px"><br/>';

            // Buttons
            // inlineHtml += '<button style="margin-left: 10px; margin-right: 5px; background-color: #FBEA51; color: #103D39; font-weight: 700; border-color: transparent; border-width: 2px; border-radius: 15px; height: 30px" type="button" id="new_agreement" onclick="">New Franchisee Agreement</button>';
            inlineHtml += '<h1 style="font-size: 25px; font-weight: 700; color: #103D39; text-align: center">Mass Invoice Email: Franchisee - ' + zee_name + '</h1>';

            // Click for Instructions
            // inlineHtml += '<button type="button" class="btn btn-sm btn-info instruction_button" data-toggle="collapse" data-target="#demo" style="background-color: #FBEA51; color: #103D39;">Click for Instructions</button><div id="demo" style="background-color: #cfeefc !important;border: 1px solid #417ed9;padding: 10px 10px 10px 20px;width:96%;position:absolute" class="collapse"><b><u>IMPORTANT INSTRUCTIONS:</u></b>';
            // inlineHtml += '<ul><li><input type="button" class="btn-xs" style="background-color: #fff; color: black;" disabled value="Submit Search" /> - <ul><li>Click "Submit Search" to load Datatable using current parameters</li></ul></li>'
            // inlineHtml += '<li>Functionalities available on the Debt Collections Table:<ul><li><b>Sort</b><ul><li>Click on column headers to sort collections invoices according to the values in the columns. This is default to "Days Overdue".</li><li>Hold "Shift" and click another column to sort according to multiple columns.</li></ul></li><li><b>Search</b><ul><li>You can search for specific Customer or Invoice by typing into the "Search" field</li></ul></li></ul></li>';
            // inlineHtml += '<li>Table Filters:<ul><li><b>Matching MAAP Allocation</b><ul><li><button type="button" class="btn-xs btn-success " disabled><span class="glyphicon glyphicon-plus"></span></button> - Click to apply MAAP Allocation filters search filters on table. ONLY click once. </li><li><button type="button" class="btn-xs btn-danger " disabled><span class="glyphicon glyphicon-minus"></span></button> - Click to remove MAAP Allocation search filter from table. This is set default to "Days Overdue".</li></ul></li> <li><b>MP Ticket Column</b><ul><button type="button" class="btn-xs btn-success" disabled><span class="glyphicon glyphicon-plus"></span></button> - Click to apply MAAP Allocation filters search filters on table. ONLY click once. </li></ul></li></ul></li><li>Clickable Actions Available Per Invoice in DataTable:</li>';
            // inlineHtml += '<ul><li><button type="button" class="btn-xs" disabled><span class="span_class glyphicon glyphicon-pencil"></span></button> - Click to open Notes Section for Selected Invoice. (Notes Section is seperate from User Notes)</li>';
            // inlineHtml += '<li><button type="button" class="btn-xs btn-secondary" disabled><span class="glyphicon glyphicon-eye-open"></span></button> - Click to Set Invoice has "Viewed" by a member of the Finance Team.</li>';
            // inlineHtml += '<li><button type="button" class="btn-xs btn-info" disabled><span class="glyphicon glyphicon-time"></span></button> - Click to view Snooze Timers</li><li><button type="button" class="timer-1day form=control btn-xs btn-info" disabled><span class="span_class">1 Day</span></button> - Click to select Snooze duration of invoice from Debt Collections Page.</li>';
            // inlineHtml += '</li></ul></div>';

            /** Start of HTML */
            inlineHtml += '<br>';

            inlineHtml += goBack();

            inlineHtml += loadingSection();

            inlineHtml += dataTable();

            inlineHtml += goBack();

            inlineHtml += '</div></div>'

            /** End of HTML */
            
            form.addField({
                id: 'preview_table',
                label: 'inlinehtml',
                type: 'inlinehtml'
            }).updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            }).defaultValue = inlineHtml;

            form.addField({
                id: 'custpage_mass_inv_open_zee_id',
                label: 'Franchisee ID',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            }).defaultValue = zee_id;

            form.addField({
                id: 'custpage_table_csv',
                label: 'CSV Export',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            });

            form.addSubmitButton({
                label: ' '
            });

            form.clientScriptFileId = 5622065; // Sandbox: 5622065 | Prod: 5882583

            context.response.writePage(form);
        } else {
            var params = context.request.parameters;

            var customerId = params.custpage_service_debt_cust_id;
            var zeeId = parseInt(params.custpage_service_debt_zee_id);
            var userId = params.custpage_mass_inv_email_user_email;

            // CALL SCHEDULED SCRIPT
            var params = {
                custscript_ss_serv_debt_zee_id: zeeId,
                custscript_ss_serv_debt_user_id: userId
            }
            var scriptTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_ss_service_debt',
                deploymentId: 'customdeploy1',
                params: params
            });
            var ss_id = scriptTask.submit();
            var myTaskStatus = task.checkStatus({
                taskId: ss_id
            });
            log.debug({
                title: 'Task Status',
                details: myTaskStatus
            });

            // Redirect
            var params2 = {zeeid: zeeId}
            redirect.toSuitelet({
                scriptId: 'customscript_sl_service_debt',
                deploymentId: 'customdeploy_sl_service_debt',
                parameters: params2
            });

            // Create Loading Sequence.
            var form = ui.createForm({ title: ' ' });

            var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';
            // Load Tooltip
            inlineHtml += '<script src="https://unpkg.com/@popperjs/core@2"></script>';

            // Load Bootstrap
            inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
            inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';
            // Load DataTables
            inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
            inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';
            // Load Netsuite stylesheet and script
            inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
            inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
            inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
            inlineHtml += '<style>.mandatory{color:red;}</style>';

            inlineHtml += '<div style="margin-top: -40px"><br/>';

            inlineHtml += 'Scheduled Emails Being Processed. Redirecting ...'

            inlineHtml += '</div>' //</div>

            form.addField({
                id: 'preview_table',
                label: 'inlinehtml',
                type: 'inlinehtml'
            }).updateLayoutType({
                layoutType: ui.FieldLayoutType.STARTROW
            }).defaultValue = inlineHtml;

            form.addField({
                id: 'custpage_service_debt_zee_id',
                label: 'Franchisee ID',
                type: ui.FieldType.TEXT
            }).updateDisplayType({
                displayType: ui.FieldDisplayType.HIDDEN
            }).defaultValue = zee_id;

            form.clientScriptFileId = 5622065; // Sandbox: 5622065 | Prod: 5882583

            context.response.writePage(form);
        }
    }

    /**
     * The table that will display the differents invoices linked to the franchisee and the time period.
     * @return  {String}    inlineQty
     */
    function dataTable() {
        var inlineQty = '<style>table#data_preview {font-size: 12px;text-align: center;border: none; background-color: white;}.dataTables_wrapper {font-size: 14px;}table#data_preview th{text-align: center;} .bolded{font-weight: bold;} </style>';
        
        // CSV Export
        inlineQty += '<button class="csv-export btn btn-sm btn-info hide" type="button" id="csv-export" style="background-color: #FBEA51; color: #103D39;">CSV Export</button>'

        // inlineQty += '<div style="width: 75%;">'
        inlineQty += '<table id="data_preview" class="table table-responsive table-striped customer tablesorter">'; // style="width: 75%;"
        inlineQty += '<thead style="color: white; background-color: #379E8F;">';
        inlineQty += '<tr class="text-center">';
        inlineQty += '</tr>';
        inlineQty += '</thead>';

        inlineQty += '<tbody id="result_data" class="result-data"></tbody>';

        inlineQty += '</table>';

        // inlineQty += '</div>';

        return inlineQty;
    }
    
    function goBack() {
        // Save Edit
        var inlineQty = '<div class="container">'; //style="margin-top: 20px;"
        inlineQty += '<div class="row justify-content-center">';

        inlineQty += '<div class="col-xs-4"></div>';
        inlineQty += '<div class="col-4">';
        inlineQty += '<button style="background-color: #FBEA51; color: #103D39; font-weight: 700; border-color: transparent; border-width: 2px; border-radius: 15px; height: 30px" type="button" id="back" class="col-xs-4 back hide">Go Back</button>';
        inlineQty += '</div>';
        inlineQty += '<div class="col-xs-4"></div>';

        inlineQty += '</div></div>';

        return inlineQty;
    }

    function loadingSection() {
        var inlineQty = '<div class="form-group container loading_section"></div>';
        inlineQty += '<style> .loading_section { border: 14px solid #f3f3f3; border-radius: 50%; border-top: 14px solid #379E8F; width: 90px; height: 90px; -webkit-animation: spin 2s linear infinite; /* Safari */ animation: spin 2s linear infinite;';
        inlineQty += 'left: 50%; }' //position: fixed; z-index: 1000; 
            /* Safari */
        inlineQty += '@-webkit-keyframes spin {0% { -webkit-transform: rotate(0deg); } 100% { -webkit-transform: rotate(360deg); } }';

        inlineQty += '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        inlineQty += '</style>';

        return inlineQty;
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
        onRequest: onRequest
    }
});