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
    var dataSet2 = [];

    var zeeSet = [];
    var taskIdSet = [];
    
    var progressBar;
    var totalCount = 0;
    var nb_emailed = 0;
    var listID = [];

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
        /** IF */
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
                { title: 'Assigned To' },
                { title: 'Title' }, // 5
                { title: 'No. of Invoices' }, // 6
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

        // Set Checkbox Checked all
        $(".form-check-input").prop("checked", true);
        $(".form-check-input").parent().parent().css('background-color', 'rgba(144, 238, 144, 0.75)');

        // Toggle Customer In List
        $(document).on('click', '#zee-include', function(){
            var zeeId = $(this).attr('zee-id');
            var taskId = $(this).attr('task-id');
            var invCount = $(this).attr('inv-count');

            if ($(this).hasClass('active')){ // Active
                $(this).parent().parent().css('background-color', ''); // Blank
                $(this).removeClass('active')

                var zeeIndex = zeeSet.indexOf(zeeId);
                var taskIndex = taskIdSet.indexOf(taskId);
                if (zeeIndex > -1){
                    totalCount = parseInt(totalCount) - parseInt(invCount);
                    zeeSet.splice(zeeIndex, 1);
                    taskIdSet.splice(taskIndex, 1);
                }   
            } else { // Not Active
                $(this).parent().parent().css('background-color', 'rgba(144, 238, 144, 0.75)'); // Green
                $(this).addClass('active')

                if (zeeSet.indexOf(zeeId) == -1){
                    totalCount = parseInt(totalCount) + parseInt(invCount)
                    zeeSet.push(zeeId);
                    taskIdSet.push(taskId);
                }
            }
            console.log('Franchisee ID Set')
            console.log(zeeSet)
            console.log('Task ID Set')
            console.log(taskIdSet)
            console.log('Total Invoice Count')
            console.log(totalCount)
        });

        $('#submit').click(function(){
            console.log('On Click : Cust Length ' + zeeSet.length);
            if (zeeSet.length > 0) {
                if (totalCount > 0) { 
                    // Trigger Submit
                    $('#submitter').trigger('click');
                } else {
                    alert('WARNING: No. of Invoices is 0')
                }
            } else {
                alert('WARNING: No Franchisees Selected');
            }
        })

        /** ELSE */
        var get_Method = currRec.getValue({ fieldId: 'custpage_mass_inv_email_method' });
        if (get_Method == 'POST'){
            totalCount = parseInt(currRec.getValue({ fieldId: 'custpage_mass_inv_email_tot_num_inv' }));
            console.log('Total Count: ' + totalCount);
            // if (!isNullorEmpty(totalCount) && totalCount.length > 0) {
                progressBar = setInterval(updateProgressBar, 1000, totalCount);
            // }

            /*  Progress Bar Info*/
            var dataTable = $("#data_preview2").DataTable({
                data: dataSet2,
                pageLength: 100,
                // autoWidth: false,
                // order: [2, 'asc'], // Company Name
                columns: [ 
                    { title: 'Emailed?' },// 0
                    { title: 'Document Number' },// 1
                    { title: 'Customer ID' }, // 2
                    { title: 'Customer Name' }, // 3
                    { title: 'Invoice Type' }, // 4
                    { title: 'Total Amount' }, // 5
                    // { title: 'Days Open' }, // 6
                ],
            });
            // Toggle Customer In List
            $(document).on('click', '.back', function(){
                var inv_id = $(this).val();

                var upload_url = baseURL + url.resolveScript({
                    deploymentId: "customdeploy_sl_mass_inv_email",
                    scriptId: "customscript_sl_mass_inv_email",
                });
                window.location.href = upload_url;
            })
        }
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
            var task_id = res.getValue('internalid');
            var date_created = res.getValue({ name: 'createddate' });
            var zee_id = res.getValue({ name: 'assigned' });
            var title = res.getValue({ name: 'title' });
            var assigned_to = res.getText({ name: 'custevent2' })
            
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
                '<input class="form-check-input active" type="checkbox" zee-id="'+zee_id+'" inv-count="'+nb_invoices+'" task-id="'+task_id+'" id="zee-include">',
                zee_id,
                date_created,
                zee_name,
                zee_state,
                assigned_to,
                title,
                inline_link,
            ]);

            // Auto Select All Tasks.
            totalCount += nb_invoices
            zeeSet.push(zee_id)
            taskIdSet.push(task_id);

            return true;
        });

    }

    function saveRecord(context) {
        console.log('Save Record Activated');

        currRec.setValue({ fieldId: 'custpage_mass_inv_email_zee_set', value: zeeSet });
        currRec.setValue({ fieldId: 'custpage_mass_inv_email_task_set', value: taskIdSet });
        currRec.setValue({ fieldId: 'custpage_mass_inv_email_tot_num_inv', value: totalCount }); //
        currRec.setValue({ fieldId: 'custpage_mass_inv_email_user_email', value: user_email });

        // Set Task as Completed;
        taskIdSet.forEach(function(taskId){
            var taskRec = record.load({ type: 'task', id: taskId});
            taskRec.setValue({ fieldId: 'status', value: "COMPLETE" }) // Set to Completed;
            taskRec.save();
        })

        return true;
    }

    /** 
     * Function called every 5 seconds until the bar is complete.
     * It performs a search to get the number of remaining results in the search.
    */
    function updateProgressBar(totalCount) {
        console.log("updateProgressBar is running");
        // try {
            nb_emailed = lengthSentList();

            console.log("Nb records moves : ", nb_emailed);
            if (nb_emailed == totalCount) {
                clearInterval(progressBar);
                $('#progress-records').attr('class', 'progress-bar progress-bar-success');

                setTimeout(redirect, 5000);
            }

            var width = parseInt((nb_emailed / totalCount) * 100);

            $('#progress-records').attr('aria-valuenow', nb_emailed);
            $('#progress-records').attr('style', 'width:' + width + '%');
            $('#progress-records').text('Total Number of Invoices Emailed : ' + nb_emailed + ' / ' + totalCount);
            console.log("width : ", width);
        // } catch (e) {
        //     if (e instanceof nlobjError) {
        //         if (e.getCode() == "SCRIPT_EXECUTION_USAGE_LIMIT_EXCEEDED") {
        //             var params = {
        //                 custscript_ss_mass_inv_email_zee_set: zeeSet,
        //                 custscript_ss_mass_inv_email_task_set: taskIdSet,
        //                 custscript_ss_mass_inv_email_tot_num_inv: totalInvCount,
        //             }
        //             var params_progress = {
        //                 custparam_selector_id: selector_id,
        //                 custparam_selector_type: selector_type,
        //                 custparam_result_set_length: totalInvCount,
        //                 custparam_timestamp: timestamp
        //             };
        //             params_progress = JSON.stringify(params_progress);
        //             var reload_url = baseURL + nlapiResolveURL('suitelet', 'customscript_sl_reallocated_barcodes', 'customdeploy_sl_reallocated_barcodes') + '&custparam_params=' + params_progress;
        //             window.open(reload_url, "_self");
        //         }
        //     }
        // }
    }

    function lengthSentList(){
        
        var sea = search.load({
            id: 'customsearch_mass_inv_email_list_2',
            type: 'customrecord_mass_inv_email_list'
        });
        var result = sea.run();
        result.each(function(res){
            var internalid = res.getValue({ name: 'internalid' });

            var doc_num = res.getValue({ name: 'custrecord_mass_inv_email_doc_num' })
            var entityid = res.getValue({ name: 'custrecord_mass_inv_email_entityid' })
            var companyname = res.getValue({ name: 'custrecord_mass_inv_email_companyname' })
            var inv_type = res.getValue({ name: 'custrecord_mass_inv_email_inv_type' })
            var tot_am = res.getValue({ name: 'custrecord_mass_inv_email_tot_am' })
            // var days_open = res.getValue({ name: 'custrecord_mass_inv_email_days_open' });
            if (listID.indexOf(internalid) == -1){
                dataSet2.push([
                    'YES', //0
                    doc_num, //1
                    entityid, // 2
                    companyname, // 3
                    inv_type, // 4
                    tot_am, // 5
                    // days_open, // 6
                ]) 
                nb_emailed++; 
            }
            listID.push(internalid);

            return true;
        });
        
        var datatable = $("#data_preview2").DataTable();
        datatable.clear();
        datatable.rows.add(dataSet2);
        datatable.draw();

        return nb_emailed;
    }

    function redirect(){
        redirect.toSuitelet({
            scriptId: 'customscript_sl_mass_inv_email',
            deploymentId: 'customdeploy_sl_mass_inv_email'
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