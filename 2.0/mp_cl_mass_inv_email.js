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
        // Background-Colors
        $("#NS_MENU_ID0-item0").css("background-color", "#CFE0CE");
        $("#NS_MENU_ID0-item0 a").css("background-color", "#CFE0CE");
        $("#body").css("background-color", "#CFE0CE");

        // Hide/UnHide Elements
        $('.loading_section').hide();
        $('#btn-uncheck-all').removeClass('hide') 
        $('#btn-check-all').removeClass('hide') 
        $('#submit').removeClass('hide');

        // // Hide Netsuite Submit Button
        $('#submitter').css("background-color", "#CFE0CE");
        $('#submitter').hide();
        $('#tbl_submitter').hide();

        var get_Method = currRec.getValue({ fieldId: 'custpage_mass_inv_email_method' });
        /** IF */
        if (get_Method != 'POST'){
            loadZeeList();

            var dataTable = $("#data_preview").DataTable({
                data: dataSet,
                pageLength: 100,
                // autoWidth: false,
                order: [[2, 'asc'], [3, 'desc']], // Date Created | Name
                columns: [ 
                    { title: 'Selector' },// 0
                    { title: 'Franchisee ID' },// 1
                    { title: "Date Submitted" }, // 2
                    { title: "Name" }, // 3
                    { title: "State" }, // 4
                    { title: 'Assigned To' }, //5
                    { title: 'Title' }, // 6
                    { title: 'No. of Invoices' }, // 7
                    { title: 'Task ID' }, //8
                ],
                columnDefs: [
                    { 
                        targets: [8],
                        visible: false
                    }
                ],
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

            // Handle click on "Check All" button
            $('#btn-check-all').on('click', function() {
                console.log('Select All');
                dataTable.page.len(-1).draw();
                // Reset all Data
                zeeSet = [];
                taskIdSet = [];
                totalCount = 0;
                dataTable.rows().every(function(){
                    var index = this.data();
                    var zeeId = index[1]; // Franchisee ID
                    var taskId = index[8];
                    var invCount = parseInt((((index[7]).split('>')[1]).split('<')[0])); // Invoic Amount Count
                    zeeSet.push(zeeId);
                    taskIdSet.push(taskId)
                    totalCount += parseInt(invCount);
                });
                $('.form-check-input').prop('checked', true);
                $('.form-check-input').parent().parent().css('background-color', 'rgba(144, 238, 144, 0.75)'); // Green
                $('.form-check-input').addClass('active')
                dataTable.page.len(100).draw();

                console.log('Franchisee ID Set')
                console.log(zeeSet)
                console.log('Task ID Set')
                console.log(taskIdSet)
                console.log('Total Invoice Count')
                console.log(totalCount)
            });
            // Handle click on "Un-Check All" button
            $('#btn-uncheck-all').on('click', function() {
                console.log('Un-Select All');
                dataTable.page.len(-1).draw();
                // Reset all Data
                zeeSet = [];
                taskIdSet = [];
                totalCount = 0;
                $('.form-check-input').prop('checked', false);
                $('.form-check-input').parent().parent().css('background-color', '');
                $('.form-check-input').removeClass('active')
                dataTable.page.len(100).draw();
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
            });
        } else if (get_Method == 'POST'){
            /** ELSE */
            totalCount = parseInt(currRec.getValue({ fieldId: 'custpage_mass_inv_email_tot_num_inv' }));
            console.log('Total Count: ' + totalCount);
            // if (!isNullorEmpty(totalCount) && totalCount.length > 0) {
                progressBar = setInterval(updateProgressBar, 2500, totalCount);
            // }

            /*  Progress Bar Info*/
            var dataTable = $("#data_preview2").DataTable({
                data: dataSet2,
                pageLength: 1000,
                // autoWidth: false,
                // order: [2, 'asc'], // Company Name
                columns: [ 
                    { title: 'Emailed?' },// 0
                    { title: 'Franchisee' }, //zee_name, //1
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
                var upload_url = baseURL + url.resolveScript({
                    deploymentId: "customdeploy_sl_mass_inv_email",
                    scriptId: "customscript_sl_mass_inv_email",
                });
                window.location.href = upload_url;
            })
        }
    }

    function loadZeeList(){
        var openInvResSet = [];
        var openInvoiceList = [];
        var openInvSearch = search.load({ type: 'invoice', id: 'customsearch_mass_inv_email_list' });
        for (var invIndex = 0; invIndex < 10000; invIndex += 1000) {
            openInvResSet.push(openInvSearch.run().getRange({ start: invIndex, end: invIndex + 999 }));
        }
        for (var i = 0; i < openInvResSet.length; i++) {
            openInvResSet[i].forEach(function(res){
                // var inv_id = res.getValue({ name: 'internalid' });
                var zee_id = res.getValue({ name: 'partner' });
                // openInvoiceList.push({invid: inv_id, zeeid: zee_id});
                openInvoiceList.push({zeeid: zee_id});
                return true;
            });
        }
        console.log(openInvoiceList);

        var searchZeeList = search.load({ type: 'task', id: 'customsearch_fr_mthly_inv_complete_3_2' })
        // searchZeeList.filters.push
        searchZeeList.run().each(function(res){
            var zee_id = res.getValue({ name: 'assigned' });
            var nb_inv_filter = openInvoiceList.filter(function(el){ if (zee_id == el.zeeid){return el} });
            var nb_invoices = nb_inv_filter.length;
            
            if (nb_invoices == 0){
                return true;
            }

            var task_id = res.getValue('internalid');
            var date_created = res.getValue({ name: 'createddate' });
            var title = res.getValue({ name: 'title' });
            var assigned_to = res.getText({ name: 'custevent2' })
            
            var zee = record.load({ type: 'partner', id: zee_id });
            var zee_name = zee.getValue({ fieldId: 'companyname' })
            var zee_state = zee.getText({ fieldId: 'location' })

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
                task_id, // 8
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

        return true;
    }

    /** 
     * Function called every 5 seconds until the bar is complete.
     * It performs a search to get the number of remaining results in the search.
    */
    function updateProgressBar(totalCount) {
        console.log("updateProgressBar is running");
        console.log("Units Remaining: " + ctx.getRemainingUsage());
        try {
            nb_emailed = lengthSentList();

            console.log("Nb records moves : ", nb_emailed);
            if (nb_emailed == totalCount) {
                clearInterval(progressBar);
                $('#progress-records').attr('class', 'progress-bar progress-bar-success');
                setTimeout(redirect, 15000); // Redirect after 60 Seconds
            }

            var width = parseInt((nb_emailed / totalCount) * 100);

            $('#progress-records').attr('aria-valuenow', nb_emailed);
            $('#progress-records').attr('style', 'width:' + width + '%');
            $('#progress-records').text('Total Number of Invoices Emailed : ' + nb_emailed + ' / ' + totalCount);
            console.log("width : ", width);
        } catch (e) {
            if (e instanceof nlobjError) {
                if (e.getCode() == "SCRIPT_EXECUTION_USAGE_LIMIT_EXCEEDED") {
                    var params_progress = {
                        custpage_mass_inv_email_tot_num_inv: resultSetLength,
                        custpage_mass_inv_email_zee_set: null,
                    };
                    params_progress = JSON.stringify(params_progress);
                    var reload_url = baseURL + url.resolveScript({
                        deploymentId: "customdeploy_sl_mass_inv_email",
                        scriptId: "customscript_sl_mass_inv_email",
                    }) + '&custparam_params=' + params_progress;
                    window.open(reload_url, "_self");
                    
                }
            }
        }

    }

    function lengthSentList(){
        
        var sea = search.load({
            id: 'customsearch_mass_inv_email_list_2',
            type: 'customrecord_mass_inv_email_list'
        });
        var result = sea.run();
        result.each(function(res){
            var internalid = res.getValue({ name: 'internalid' });

            var zee_name = res.getValue({ name: 'custrecord_mass_inv_email_zee_name' }); // NEW
            var doc_num = res.getValue({ name: 'custrecord_mass_inv_email_doc_num' })
            var entityid = res.getValue({ name: 'custrecord_mass_inv_email_entityid' })
            var companyname = res.getValue({ name: 'custrecord_mass_inv_email_companyname' })
            var inv_type = res.getValue({ name: 'custrecord_mass_inv_email_inv_type' })
            var tot_am = res.getValue({ name: 'custrecord_mass_inv_email_tot_am' })
            // var days_open = res.getValue({ name: 'custrecord_mass_inv_email_days_open' });
            if (listID.indexOf(internalid) == -1){
                dataSet2.push([
                    'YES', //0
                    zee_name, //1
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
        var upload_url = baseURL + url.resolveScript({
            deploymentId: "customdeploy_sl_mass_inv_email",
            scriptId: "customscript_sl_mass_inv_email",
        });
        window.location.href = upload_url;
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