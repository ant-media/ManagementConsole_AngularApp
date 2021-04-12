import {Component,  EventEmitter, OnInit, Output} from '@angular/core';
import {RestService} from '../../rest/rest.service';
import {SupportRestService} from '../../rest/support.service';
import {Router} from '@angular/router';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import {Licence} from "../../server.settings/server.settings.component";
import {AuthService} from "../../rest/auth.service";
import {SupportRequest} from "../../support/support.definitions";
import {ServerSettings} from "../../app.page/app.definitions";
import {Locale} from "../../locale/locale";

declare var $: any;
declare var Chartist: any;
declare var swal: any;


declare interface AppInfo {
    name: string;
    liveStreamCount: number;
    vodCount: number;
    storage: number;
}

declare interface TableData {
    dataRows: AppInfo[];
}

@Component({
    selector: 'overview-cmp',
    templateUrl: './overview.component.html'
})

export class OverviewComponent implements OnInit {

    public systemCpuLoad: number;
    public processCpuLoad: number;
    public liveStreamSize: number;
    public watcherSize: number;
    public diskUsagePercent: any;
    public jvmHeapUsagePercent: any;
    public jvmNativeUsagePercent: any;
    public diskTotalSpace: any;
    public diskInUseSpace: any;
    public jvmHeapTotalSpace: any;
    public jvmHeapInUseSpace: any;
    public systemMemoryInUse: any;
    public systemMemoryTotal: any;
    public jvmNativeInUse: any;
    public jvmNativeMax: any;

    public title : string;
    public description : string;
    public sentSuccess = false;
    public processing = false;
    public isClusterMode = false;
    public cpuLoadIntervalId = 0;
    public systemMemoryUsagePercent = 0;
    public appTableData: TableData;
    public units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    public timerId:any;
    public licence : Licence;
    public serverSettings : ServerSettings;
    public newApplicationActive = false;
    public newAppCreating = false;
    public newApplicationName: string;
    public deployingApplication = false;


    constructor(private auth: AuthService, private restService:RestService, private supportRestService:SupportRestService, private router:Router) {

    }

    niceBytes(x): string {
        let l = 0, n = parseInt(x, 10) || 0;
        while (n >= 1024) {
            n = n / 1024;
            l++;
        }
        return (n.toFixed(n >= 100 || l < 1 ? 0 : 1) + ' ' + this.units[l]);
    }

    initCirclePercentage() {
        $('#chartDiskUsage,#chartJvmHeapUsage,#chartNativeMemoryUsage,#chartSystemMemory').easyPieChart({
            lineWidth: 9,
            size: 160,
            scaleColor: false,
            trackColor: '#BBDEFB',
            barColor: '#1565C0',
            animate: false,
        });
    }

    ngOnInit() {
        this.appTableData = {
            dataRows: [
            ]
        };
    }
    ngAfterViewInit() {

        this.initCirclePercentage();
        this.getSystemResources(); // All in One
        this.getApplicationsInfo();
        this.timerId = window.setInterval(() => {
            this.getSystemResources(); // All in One
            this.getApplicationsInfo();
        }, 5000);

        this.auth.initLicenseCheck();
        this.restService.isInClusterMode().subscribe(data => {
            this.isClusterMode = data['success'];

            // If it's cluster mode, shouldn't run this feature.
            if(!this.isClusterMode){
                window.setTimeout(() => {
                    this.checkShutdownProperly();
                }, 10000);
            }
        });

        if(this.auth.isCommunityCheckboxEnabled){
            this.sendCommunityEmailMessage();
        }
    }

    ngOnDestroy() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    }

    sendCommunityEmailMessage():void {
        let request = new SupportRequest();

        request.name = this.auth.user.fullName;
        request.email = this.auth.user.email;
        request.sendSystemInfo = false;

        request.title = "Community Edition campaign email";
        request.description = "Community Edition campaign email";

        this.supportRestService.sendRequest(request).subscribe(data => {
            if (data["success"] == true) {
                console.log("Community campaign mail sent properly");
            }
        });
    }

    checkShutdownProperly(): void{
        let appNames = [];
        for( var i = 0; i < this.appTableData.dataRows.length; i++ ){
            appNames.push(this.appTableData.dataRows[i]["name"]);
        }

        this.restService.isShutdownProperly(appNames.join(",")).subscribe(data => {
            //It means doesn't close normal.
            if(data["success"] == false){

                swal({
                    title: "Unexpected Shutdown",
                    text: "We've detected that your instance has not been shutdown gracefully. Just enter your e-mail and click the Submit button to let us have the logs about the problem",
                    type: 'warning',

                    input: 'email',
                    inputPlaceholder: 'Please enter your email address',

                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Submit',
                }).then((value) => {

                    var request = new SupportRequest();

                    request.name = "";
                    request.email = value;
                    request.sendSystemInfo = true;

                    request.title = "In App Shutdown Properly";
                    request.description = "Shutdown error email with logs";

                    this.processing = true;

                    this.supportRestService.sendRequest(request).subscribe(data => {
                        this.processing = false;
                        if (data["success"] == true) {
                            this.sentSuccess = true;
                            $.notify({
                                icon: "ti-email",
                                message: "Your request has been sent. Support team will contact through your e-mail soon."
                            }, {
                                type: "success",
                                delay: 5000,
                                placement: {
                                    from: 'top',
                                    align: 'right'
                                }
                            });
                        } else {
                            $.notify({
                                icon: "ti-alert",
                                message: "Your request couldn't be sent. Please try again or send email to support@antmedia.io"
                            }, {
                                type: 'warning',
                                delay: 5000,
                                placement: {
                                    from: 'top',
                                    align: 'right'
                                }
                            });
                        }
                    });

                }).catch(function (err) {
                    console.error("Error in shutdown properly: " + err)
                });

                this.restService.setShutdownProperly(appNames.join(",")).subscribe(data => {
                });

            }
        },
        error =>{
            console.error("Server returns error: " + error.status + " for shutdown-properly");
            //ask again until get a 200 response
            setTimeout(() => { this.checkShutdownProperly(); }, 10000);
        });
    }

    getSystemResources(): void {
        this.restService.getSystemResourcesInfo().subscribe(data => {

            //updateCPULoad

            this.systemCpuLoad = Number(data["cpuUsage"]["systemCPULoad"]);
            this.processCpuLoad = Number(data["cpuUsage"]["processCPULoad"]);

            this.liveStreamSize = Number(data["totalLiveStreamSize"]);

            //getSystemMemoryInfo
            this.systemMemoryTotal  = Number(data["systemMemoryInfo"]["totalMemory"]);
            this.systemMemoryInUse = Number(data["systemMemoryInfo"]["inUseMemory"]);
            var availableMemory =  Number(data["systemMemoryInfo"]["availableMemory"]);
            if (availableMemory != 0) {
                this.systemMemoryInUse = this.systemMemoryTotal - availableMemory;
            }
            
            this.systemMemoryUsagePercent = Math.round(this.systemMemoryInUse * 100 / this.systemMemoryTotal);
           
            $("#chartSystemMemory").data('easyPieChart').update(this.systemMemoryUsagePercent);
            //getFileSystemInfo

            this.diskInUseSpace = Number(data["fileSystemInfo"]["inUseSpace"]);
            this.diskTotalSpace = Number(data["fileSystemInfo"]["totalSpace"]);
            this.diskUsagePercent = Math.round(this.diskInUseSpace * 100 / this.diskTotalSpace);

            $("#chartDiskUsage").data('easyPieChart').update(this.diskUsagePercent);
         
             //getJVMNativeUsage

             this.jvmNativeInUse = Number(data["jvmNativeMemoryUsage"]["inUseMemory"]);
             this.jvmNativeMax = Number(data["jvmNativeMemoryUsage"]["maxMemory"]);
             this.jvmNativeUsagePercent = Math.round(Number(this.jvmNativeInUse * 100 / this.jvmNativeMax));

            // $("#chartJVMNativeUsage").data('easyPieChart').update(this.jvmNativeUsagePercent);

             //getJvmHeapUsage

             this.jvmHeapInUseSpace = Number(data["jvmMemoryUsage"]["inUseMemory"]);
             this.jvmHeapTotalSpace = Number(data["jvmMemoryUsage"]["maxMemory"]);
             this.jvmHeapUsagePercent = Math.round(Number(this.jvmHeapInUseSpace * 100 / this.jvmHeapTotalSpace));

             $("#chartJvmHeapUsage").data('easyPieChart').update(this.jvmHeapUsagePercent);

        },
            this.handleError);
    }

    handleError(error:Response) {

        console.log("error status: " + error.status);
        if (error.status == 401) {
            console.log(this.router);
            //this.router.navigateByUrl("/pages/login");
        }

    }

    getApplicationsInfo(): void {
        this.restService.getApplicationsInfo().subscribe(data => {
            this.appTableData.dataRows = [];
            for (var i in data) {
                this.appTableData.dataRows.push(data[i]);
            }
        });
    }

    isMobileMenu() {
        if ($(window).width() > 991) {
            return true;
        }
        return false;
    }

    newApplication() {
        this.newApplicationActive = true;
    }

    cancelNewApplication() {
        this.newApplicationActive = false;
        this.newApplicationName = "";
    }

    checkApplicationDeleted(appName: string) {
        setTimeout(() => {
            this.restService.getApplications().subscribe(data => {
                var appExists = false;
                for (var i in data['applications']) {
                    if (data['applications'][i] == appName) {
                        appExists = true;
                        break;
                    }
                }
                //app is deleted
                if (!appExists) {
                    $.notify({
                        icon: "ti-save",
                        message: "Application is deleted."
                    }, {
                        type: "success",
                        delay: 3000,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
                    this.getApplicationsInfo();
                    this.restService.getSidebar().initApplications();
                }
                else {
                    //check again if it's deleted
                    this.checkApplicationDeleted(appName);
                }
            },
            error=> {
                console.log("Error occured: " + error);
            });
        }, 2000);
    }

    checkApplicationCreated(appName:string) {
        setTimeout(() => {
            this.restService.getApplications().subscribe(data => {
                var appDeployed = false;
                for (var i in data['applications']) {
                    if (data['applications'][i] == appName) {
                        appDeployed = true;
                        break;
                    }
                }

                if (appDeployed) {
                    this.newAppCreating = false;
                    this.deployingApplication = false;
                    this.cancelNewApplication();
                     
                    $.notify({
                            icon: "ti-save",
                            message: "Application is created."
                    }, {
                            type: "success",
                            delay: 3000,
                            placement: {
                                from: 'top',
                                align: 'right'
                            }
                    });

                    this.getApplicationsInfo();
                    this.restService.getSidebar().initApplications();
                }
                else {
                    this.checkApplicationCreated(appName);
                }
            });

        }, 2000);
    }

    createApplication(isValid: boolean): void {
        if (!isValid) {
            //not valid form return directly
            return;
        }
        this.newAppCreating = true;
        this.restService.createApplication(this.newApplicationName)
            .subscribe(
                data => {
                   
                    if (data["success"] == true) {
                        this.deployingApplication = true;

                       this.checkApplicationCreated(this.newApplicationName);   
                    }
                    else {
                        this.newAppCreating = false;
                        swal({
                            title: "Application is not created",
                            text: data["message"],
                            type: 'error',
            
                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'OK'
                        }).then(() => {
                        }).catch(function () {
                        });
                       
                    }

                }, 
                error=> {
                    this.newAppCreating = false;
                    swal({
                        title: "Application is not created",
                        text:  "Make sure that you use alphanumeric characters in the application name",
                        type: 'error',
        
                        confirmButtonColor: '#3085d6',
                        confirmButtonText: 'OK'
                    }).then(() => {
                    }).catch(function () {
                    });
                });
    }

    deleteApplication(appName:string):void {

        swal({
            title: Locale.getLocaleInterface().are_you_sure,
            text: Locale.getLocaleInterface().wont_be_able_to_revert,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(() => {

            this.restService.deleteApplication(appName).subscribe(
                data=> {
                    if (data["success"] == true) {
                        this.checkApplicationDeleted(appName);
                    }
                    else {
                        $.notify({
                            icon: "ti-save",
                            message: "Application is not deleted. Please send logs to the support team"
                            }, {
                            type: "warning",
                            delay: 3000,
                            placement: {
                                from: 'top',
                                align: 'right'
                            }
                    });
                    }
                },
                error => {
                    swal({
                        title: "Application is not deleted",
                        text:  "Please send logs files under log directory to the Ant Media Support(support@antmedia.io)",
                        type: 'error',
        
                        confirmButtonColor: '#3085d6',
                        confirmButtonText: 'OK'
                    }).then(() => {
                    }).catch(function () {
                    });
                }
            );

        }).catch(function () {

        });



        
    }
}
