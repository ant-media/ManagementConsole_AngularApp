import {
    Component, OnInit, OnDestroy, Renderer, NgZone, Inject, EventEmitter, Output, Input,
    ViewChild, AfterViewInit, ChangeDetectorRef, SimpleChanges,OnChanges} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { SERVER_ADDR, REST_SERVICE_ROOT, HTTP_SERVER_ROOT } from '../rest/rest.service';
import { RestService, LiveBroadcast } from '../rest/rest.service';
import { ClipboardService } from 'ngx-clipboard';
import { Locale } from "../locale/locale";
import {
    MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatCheckboxModule, PageEvent, MatPaginator, MatSort,
    MatTableDataSource, MatPaginatorIntl
} from '@angular/material';
import "rxjs/add/operator/toPromise";
import {RequestOptions} from "@angular/http";









declare var $: any;
declare var Chartist: any;
declare var swal: any;
declare var classie:any;



const ERROR_SOCIAL_ENDPOINT_UNDEFINED_CLIENT_ID = -1;
const ERROR_SOCIAL_ENDPOINT_UNDEFINED_ENDPOINT = -2;
const ERROR_SOCIAL_ENDPOINT_NO_ENDPOINT = -3;

declare interface Endpoint {
    type: string;
}

declare interface VOD {
    type: string;
    streamName:string;
    streamId:string;
    vodName:string;
    creationDate:string;
    duration:string;
}

declare interface BroadcastInfo {
    name: string;
    type:string;
    streamId: string;
    viewerCount: number;
    status: string;
    endPointList: Endpoint[];
    vodList:VOD[];
    ipAddr:string;
    username:string;
    password:string;
    rtspUrl:string;
    date:number;
    duration:number;
    iframeSource:string;



}

declare interface VodInfo{
    streamName: string;
    streamId:string;
    filePath: string;
    viewerCount: number;
    vodName: string;
    creationDate:number;
    duration:number;
    fileSize:number;
    vodId:string;

}
declare interface CamStreamInfo{
    name: string;
    type:string;
    streamId: string;
    viewerCount: number;
    status: string;
    endPointList: Endpoint[];
    vodList:VOD[];
    ipAddr:string

}



declare interface EncoderSettings {
    height: Number;
    videoBitrate: Number;
    audioBitrate: Number;
}

declare interface BroadcastInfoTable {
    dataRows: BroadcastInfo[];

}

declare interface VodInfoTable {
    dataRows: VodInfo[];

}

declare interface CameraInfoTable{

    list:CamStreamInfo[];
}

declare function require(name: string);
var flowplayer = require('flowplayer');
var engine = require('flowplayer-hlsjs');
engine(flowplayer);

export class HLSListType {
    constructor(public name: string, public value: string) {
    }
}

export class Camera {
    constructor(
        public name: string,
        public ipAddr: string,
        public username: string,
        public password: string,
        public rtspUrl: string,
        public type:string)
    { }
}

export class AppSettings {

    constructor(public mp4MuxingEnabled: boolean,
                public addDateTimeToMp4FileName: boolean,
                public hlsMuxingEnabled: boolean,
                public hlsListSize: Number,
                public hlsTime: Number,
                public hlsPlayListType: string,

                public facebookClientId: string,
                public facebookClientSecret: string,

                public youtubeClientId: string,
                public youtubeClientSecret: string,

                public periscopeClientId: string,
                public periscopeClientSecret: string,
                public encoderSettings: EncoderSettings[],
                public acceptOnlyStreamsInDataStore: boolean) {

    }
}

export class SocialNetworkChannel {
    public type: string;
    public name: string;
    public id: string;
}

export class SearchParam {
    public keyword: string;
    public startDate: number;
    public endDate: number;
}


export class SocialMediAuthStatus {
    public isFacebookAuthenticated: boolean;
    public isPeriscopeAuthenticated: boolean;
    public isYoutubeAuthenticated: boolean;

    public facebookPublishChannel: SocialNetworkChannel;
}

@Component({
    selector: 'manage-app-cmp',
    moduleId: module.id,
    templateUrl: 'app.page.component.html',
    styleUrls: ['app.page.component.css'],


})


export class AppPageComponent implements OnInit, OnDestroy,AfterViewInit {

    public appName: string;
    public sub: any;
    public broadcastTableData: BroadcastInfoTable;
    public gridTableData:CameraInfoTable;
    public vodTableData: VodInfoTable;
    public timerId: any;
    public checkAuthStatusTimerId: any;
    public socialMediaAuthStatus: SocialMediAuthStatus;
    public newLiveStreamActive: boolean;
    public newIPCameraActive:boolean;
    public newStreamSourceActive:boolean;
    public liveBroadcast: LiveBroadcast;
    public liveBroadcastShareFacebook: boolean;
    public liveBroadcastShareYoutube: boolean;
    public liveBroadcastSharePeriscope: boolean;
    public newLiveStreamCreating = false;
    public newIPCameraAdding = false;
    public newStreamSourceAdding=false
    public  newStreamSourceWarn = true;
    public discoveryStarted = false;
    public newSourceAdding= false;
    public isEnterpriseEdition = false;
    public gettingPeriscopeParameters = false;
    public gettingYoutubeParameters = false;
    public gettingFacebookParameters = false;

    public camera:Camera;
    public onvifURLs:String[];
    public newOnvifURLs:String[];
    public broadcastList:CameraInfoTable;
    public noCamWarning=false;
    public isGridView=false;
    public keyword:string;
    public startDate:string;
    public endDate:string;
    public requestedStartDate:number;
    public requestedEndDate:number;
    public searchWarning=false;
    public searchParam:SearchParam;
    public selectedBroadcast:LiveBroadcast;
    public showVodButtons=false;

    public waitingForPeriscopeToBeAuthorized = false;
    public waitingForYoutubeToBeAuthorized = false;
    public waitingForFacebookToBeAuthorized = false;
    public userFBPagesLoading = false;
    public liveStreamEditing: LiveBroadcast;
    public editBroadcastShareYoutube: boolean;
    public editBroadcastShareFacebook: boolean;
    public editBroadcastSharePeriscope: boolean;
    public liveStreamUpdating = false;




    public appSettings: AppSettings; // = new AppSettings(false, true, true, 5, 2, "event", "no clientid", "no fb secret", "no youtube cid", "no youtube secre", "no pers cid", "no pers sec");
    public listTypes = [
        new HLSListType('None', ''),
        new HLSListType('Event', 'event'),
    ];


    displayedColumnsStreams = ['name', 'status', 'social_media', 'actions'];
    displayedColumnsVod = ['name', 'date',  'actions'];


    dataSource: MatTableDataSource<BroadcastInfo>;

    dataSourceVod: MatTableDataSource<VodInfo>;


    public streamsPageSize=5;


    public vodPageSize=5;



    pageSize=5 ;
    pageSizeOptions = [5, 10, 25, 100];

    streamsLength:number;
    vodLength:number;

    // MatPaginator Output

    @Input() pageEvent: PageEvent;

    @Output()
    pageChange: EventEmitter<PageEvent>;




    @ViewChild(MatPaginator) paginator: MatPaginator;
    @ViewChild(MatSort) sort: MatSort;




    constructor(private http: HttpClient, private route: ActivatedRoute,
                private restService: RestService,
                private clipBoardService: ClipboardService,
                private renderer: Renderer,
                public router: Router,
                private zone: NgZone,
                public dialog: MatDialog,
                public sanitizer: DomSanitizer,
                private cdr: ChangeDetectorRef,
                private matpage: MatPaginatorIntl,



    ) {


        this.dataSource = new MatTableDataSource<BroadcastInfo>();
        this.dataSourceVod=new MatTableDataSource<VodInfo>();


    }

    setPageSizeOptions(setPageSizeOptionsInput: string) {
        this.pageSizeOptions = setPageSizeOptionsInput.split(',').map(str => +str);
    }






    ngOnInit() {









        //  Init Bootstrap Select Picker
        if($(".selectpicker").length != 0){
            $(".selectpicker").selectpicker({
                iconBase: "ti",
                tickIcon: "ti-check"
            });
        }

        $('.datepicker').datetimepicker({
            format: 'YYYY-MM-DD', //use this format if you want the 12hours timpiecker with AM/PM toggle
            icons: {
                time: "fa fa-clock-o",
                date: "fa fa-calendar",
                up: "fa fa-chevron-up",
                down: "fa fa-chevron-down",
                previous: 'fa fa-chevron-left',
                next: 'fa fa-chevron-right',
                today: 'fa fa-screenshot',
                clear: 'fa fa-trash',
                close: 'fa fa-remove'
            }
        });


        var self = this;

        this.zone.run(() => {

            $('#selectBox').change(function () {


                var val=$(this).val();
                console.log(val);

                self.filterAppLiveStreams(val);

            });

        });


        this.broadcastTableData = {
            dataRows: [],
        };

        this.gridTableData={
            list:[]
        };


        this.vodTableData = {
            dataRows: []
        };

        this.socialMediaAuthStatus = new SocialMediAuthStatus();
        this.liveBroadcast = new LiveBroadcast();
        this.selectedBroadcast=new LiveBroadcast();
        this.liveBroadcast.name = "";
        this.liveBroadcast.type= "";
        this.liveBroadcastShareFacebook = false;
        this.liveBroadcastShareYoutube = false;
        this.liveBroadcastSharePeriscope = false;
        this.searchParam=new SearchParam();


        this.appSettings = null;
        this.newLiveStreamActive = false;
        this.camera=new Camera("","","","","","");

    }


    onPaginateChange(event){


        console.log("page index:" + event.pageIndex);
        console.log("length:"+ event.length);
        console.log("page size:"+event.pageSize);



        if(event.pageIndex==0){
            this.keyword=null;
            console.log("index sifir");
            this.restService.getVodList(this.appName, 0, event.pageSize).subscribe(data  => {
                this.vodTableData.dataRows = [];
                for (var i in data) {
                    this.vodTableData.dataRows.push(data[i]);
                }

                this.dataSourceVod = new MatTableDataSource(this.vodTableData.dataRows);


            });

        }else {


            event.pageIndex = event.pageIndex * event.pageSize ;

            this.keyword = null;

            this.restService.getVodList(this.appName, event.pageIndex, event.pageSize).subscribe(data => {
                this.vodTableData.dataRows = [];
                for (var i in data) {
                    this.vodTableData.dataRows.push(data[i]);
                }

                this.dataSourceVod = new MatTableDataSource(this.vodTableData.dataRows);


            });

        }

    }


    ngAfterViewInit() {


        setTimeout(() => {

            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;

        }, 300);



        /*
                setTimeout(() => {
                    console.log(this.vodTableData.dataRows.length);
                    if (this.vodTableData.dataRows.length>0){
                        this.showVodButtons=false;


                    } else {
                        this.showVodButtons=true;

                    }
                }, 500);

        */

        this.cdr.detectChanges();


        this.sub = this.route.params.subscribe(params => {
            this.appName = params['appname']; // (+) converts string 'id' to a number

            if (typeof this.appName == "undefined") {
                this.restService.getApplications().subscribe(data => {

                    //second element is the Applications. It is not safe to make static binding.




                    for (var i in data['applications']) {
                        //console.log(data['applications'][i]);
                        this.router.navigateByUrl("/applications/" + data['applications'][i]);

                        break;
                    }
                });


                return;
            }
            this.getVoDStreams();


            this.getAppLiveStreams();






            this.getSettings();
            //this.getAppLiveStreamsOnce();



            this.restService.isEnterpriseEdition().subscribe(data => {
                this.isEnterpriseEdition = data["success"];
            })

            /*
            setTimeout(() => {
                this.switchToListView();
            }, 500);

            */
            this.timerId = window.setInterval(() => {
                // this.getAppLiveStreams();
                // this.getVoDStreams();

            }, 10000);



        });

    }



    applyFilter(filterValue: string) {
        filterValue = filterValue.trim(); // Remove whitespace
        filterValue = filterValue.toLowerCase(); // Datasource defaults to lowercase matches
        this.dataSource.filter = filterValue;
    }

    applyFilterVod(filterValue: string) {
        filterValue = filterValue.trim(); // Remove whitespace
        filterValue = filterValue.toLowerCase(); // Datasource defaults to lowercase matches
        this.dataSourceVod.filter = filterValue;
    }

    openSettingsDialog(selected:LiveBroadcast): void {

        this.selectedBroadcast=selected;

        let dialogRef = this.dialog.open(CamSettinsDialogComponent, {
            width: '300px',
            data: { name:this.selectedBroadcast.name,url:this.selectedBroadcast.ipAddr,
                username:this.selectedBroadcast.username,pass:this.selectedBroadcast.password,id:this.selectedBroadcast.streamId,
                status:this.selectedBroadcast.status,appName:this.appName}
        });


        dialogRef.afterClosed().subscribe(result => {
            console.log('The dialog was closed');
            this.getAppLiveStreams();

        });
    }


    openVodUploadDialog(): void {



        let dialogRef = this.dialog.open(UploadVodDialogComponent, {

        });


        dialogRef.afterClosed().subscribe(result => {
            console.log('The dialog was closed');


        });
    }

    test(){

        alert("test");

    }



    getAppLiveStreams(): void {
        this.restService.getAppLiveStreams(this.appName, 0, 99999).subscribe(data => {
            //console.log(data);
            this.broadcastTableData.dataRows = [];
            //console.log("type of data -> " + typeof data);

            for (var i in data) {


                var endpoint = [];
                for (var j in data[i].endPointList) {
                    endpoint.push(data[i].endPointList[j]);
                }


                this.broadcastTableData.dataRows.push(data[i]);


                this.broadcastTableData.dataRows[i].iframeSource="http://localhost:5080/LiveApp/play.html?name="+this.broadcastTableData.dataRows[i].streamId+ "&autoplay=true";
                // console.log("iframe source:  "+this.broadcastTableData.dataRows[i].iframeSource);

            }

            this.dataSource = new MatTableDataSource(this.broadcastTableData.dataRows);
            this.streamsLength= this.broadcastTableData.dataRows.length;

            if(this.isGridView){
                setTimeout(() => {
                    this.openGridPlayers();
                }, 300);}

        });


        setTimeout(() => {
            this.dataSource.paginator = this.paginator;
            this.dataSource.sort = this.sort;

        }, 300);





    }


    cleanURL(oldURL: string): SafeResourceUrl{
        console.log("clean url");
        return this.sanitizer.bypassSecurityTrustResourceUrl(oldURL);
    }


    filterAppLiveStreams(type:String): void {

        if(type=="displayAll"){


            this.getAppLiveStreams();
        }

        else{
            this.restService.filterAppLiveStreams(this.appName, 0, 10,type).subscribe(data => {
                //console.log(data);
                this.broadcastTableData.dataRows = [];
                console.log("type of data -> " + typeof data);

                for (var i in data) {

                    this.broadcastTableData.dataRows.push(data[i]);

                }



                if(this.isGridView){
                    setTimeout(() => {
                        this.openGridPlayers();
                    }, 500);

                }


                setTimeout(function () {
                    $('[data-toggle="tooltip"]').tooltip();
                }, 500);



            });
        }


    }



    getAppLiveStreamsOnce(): void {
        this.restService.getAppLiveStreams(this.appName, 0, 10).subscribe(
            data => {
                //console.log(data);
                this.gridTableData.list = [];
                console.log("type of data -> " + typeof data);

                for (var i in data) {



                    this.gridTableData.list.push(data[i]);



                }
                setTimeout(function () {
                    $('[data-toggle="tooltip"]').tooltip();
                }, 500);

            });
    }



    getVoDStreams(): void {

        this.searchWarning=false;
        this.keyword=null;


        //this for getting full length of vod streams for paginations

        //TODO: (davut) write a seperate rest service which turns vod streams total length
        this.restService.getVodList(this.appName, 0, 99999).subscribe(data  => {
            this.vodTableData.dataRows = [];
            for (var i in data) {
                this.vodTableData.dataRows.push(data[i]);
            }

            this.vodLength= this.vodTableData.dataRows.length;


        });


        this.restService.getVodList(this.appName, 0, 5).subscribe(data  => {
            this.vodTableData.dataRows = [];
            for (var i in data) {
                this.vodTableData.dataRows.push(data[i]);
            }

            this.dataSourceVod = new MatTableDataSource(this.vodTableData.dataRows);



        });













    }



    ngOnDestroy() {
        this.sub.unsubscribe();
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    }

    getVoD(): void {
        this.getVoDStreams();
    }

    isMobileMenu() {
        if ($(window).width() > 991) {
            return true;
        }
        return false;
    }

    checkAndPlayLive(videoUrl: string): void {
        this.http.get(videoUrl, { responseType: 'text' }).subscribe(data => {
                console.log("loaded...");
                $("#playerLoading").hide();
                flowplayer('#player', {
                    autoplay: true,
                    clip: {
                        sources: [{
                            type: 'application/x-mpegurl',
                            src: videoUrl
                        }]
                    }
                });

            },
            error => {
                console.log("error...");
                setTimeout(() => {
                    this.checkAndPlayLive(videoUrl);
                }, 5000);
            });
    }




    playLive(streamId: string): void {
        if (this.isEnterpriseEdition) {
            streamId += "_adaptive";
        }
        var srcFile = HTTP_SERVER_ROOT + this.appName + '/streams/' + streamId + '.m3u8';
        swal({
            html: '<div id="player"></div>',
            showConfirmButton: false,
            width: '600px',
            padding: 10,
            animation: false,
            showCloseButton: true,
            onOpen: () => {
                flowplayer('#player', {
                    autoplay: true,
                    clip: {
                        sources: [{
                            type: 'application/x-mpegurl',
                            src: srcFile
                        }]
                    }
                });
            },
            onClose: function () {
                flowplayer("#player").shutdown();
            }
        }).then(function () { }, function () { });
    }


    openGridPlayers():void{



        var id,name,srcFile,iframeSource;


        for (var i in this.broadcastTableData.dataRows) {


            id=this.broadcastTableData.dataRows[i]['streamId'];

            name=this.broadcastTableData.dataRows[i]['name'];

            srcFile = HTTP_SERVER_ROOT + this.appName + '/streams/' + this.broadcastTableData.dataRows[i]['streamId'] + '.m3u8';

            console.log(id+"::::"+name+":::::::::"+srcFile);

            iframeSource="http://" + location.hostname + ":5080/"+this.appName+"/play.html?name="+id+"&autoplay=true";


            var $iframe = $('#' + id);

            $iframe.prop('src', iframeSource);


            // install flowplayer into selected container


            /*
                var container = document.getElementById(id);

            flowplayer(container, {

                clip: {
                    autoplay: true,

                    sources: [
                        { type: "application/x-mpegurl",
                            src:  srcFile }
                    ]
                }
            });


*/




            //   container.setAttribute("style","width:500px");





        }
    }
    closeGridPlayers():void{

        var id;


        for (var i in this.broadcastTableData.dataRows) {


            id = this.broadcastTableData.dataRows[i]['streamId'];


            var container = document.getElementById(id);

            flowplayer(container).shutdown();


            $("#" + id).html("").attr('class', +'');       }

    }







    playLiveCame(streamId: string): void {
        if (this.isEnterpriseEdition) {
            streamId += "_adaptive";
        }
        var srcFile = HTTP_SERVER_ROOT + this.appName + '/streams/' + streamId + '.m3u8';
        swal({
            html: '<div id="player"></div>',
            showConfirmButton: false,
            width: '600px',
            padding: 10,
            animation: false,
            showCloseButton: true,
            onOpen: () => {
                flowplayer('#player', {
                    autoplay: true,
                    clip: {
                        sources: [{
                            type: 'application/x-mpegurl',
                            src: srcFile
                        }]
                    }
                });
            },
            onClose: function () {
                flowplayer("#player").shutdown();
            }
        }).then(function () { }, function () { });
    }



    playVoD(streamName: string): void {
        // var container = document.getElementById("player");
        // install flowplayer into selected container
        var srcFile = HTTP_SERVER_ROOT + this.appName + '/streams/' + streamName;

        swal({
            html: '<div id="player"></div>',
            showConfirmButton: false,
            width: '800px',
            animation: false,
            onOpen: function () {

                flowplayer('#player', {
                    autoplay: true,
                    clip: {
                        sources: [{
                            type: 'video/mp4',
                            src: srcFile
                        }]
                    }
                });
            },
            onClose: function () {
                flowplayer("#player").shutdown();
            }
        });
    }

    //file with extension
    deleteVoD(fileName: string,vodId:number): void {

        let VoDName = fileName.substring(0, fileName.lastIndexOf("."));
        swal({
            title: Locale.getLocaleInterface().are_you_sure,
            text: Locale.getLocaleInterface().wont_be_able_to_revert,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(() => {

            this.restService.deleteVoDFile(this.appName, VoDName,vodId).subscribe(data => {
                if (data["success"] == true) {

                }
                else {
                    this.showVoDFileNotDeleted();
                };
                this.getVoDStreams();
            });

        }).catch(function () {

        });



    }

    showVoDFileNotDeleted() {
        $.notify({
            icon: "ti-save",
            message: Locale.getLocaleInterface().vodFileNotDeleted
        }, {
            type: "warning",
            delay: 900,
            placement: {
                from: 'top',
                align: 'right'
            }
        });
    }

    editLiveBroadcast(stream: BroadcastInfo): void {
        if (stream.endPointList != null)
        {
            this.editBroadcastShareFacebook = false;
            this.editBroadcastShareYoutube = false;
            this.editBroadcastSharePeriscope = false;

            stream.endPointList.forEach(element => {
                switch (element.type) {
                    case "facebook":
                        this.editBroadcastShareFacebook = true;
                        break;
                    case "youtube":
                        this.editBroadcastShareYoutube = true;
                        break;
                    case "periscope":
                        this.editBroadcastSharePeriscope = true;
                        break;
                }

            });
        }
        if (this.liveStreamEditing == null || stream.streamId != this.liveStreamEditing.streamId) {
            this.liveStreamEditing = new LiveBroadcast();
            this.liveStreamEditing.streamId = stream.streamId;
            this.liveStreamEditing.name = stream.name;
            this.liveStreamEditing.description = "";
        }
        else {
            this.liveStreamEditing = null;
        }
    }


    updateLiveStream(isValid: boolean): void {
        if (!isValid) {
            return;
        }

        this.liveStreamUpdating = true;
        var socialNetworks = [];

        if (this.editBroadcastShareFacebook) {
            socialNetworks.push("facebook");
        }

        if (this.editBroadcastShareYoutube == true) {
            socialNetworks.push("youtube");
        }

        if (this.editBroadcastSharePeriscope == true) {
            socialNetworks.push("periscope");
        }

        this.restService.updateLiveStream(this.appName, this.liveStreamEditing,
            socialNetworks).subscribe(data => {
            this.liveStreamUpdating = false;
            console.log(data["success"]);
            if (data["success"]) {
                this.liveStreamEditing = null;
                //update the rows
                this.getAppLiveStreams();
                $.notify({
                    icon: "ti-save",
                    message: Locale.getLocaleInterface().broadcast_updated
                }, {
                    type: "success",
                    delay: 900,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
            else {
                $.notify({
                    icon: "ti-alert",
                    message: Locale.getLocaleInterface().broadcast_not_updated  + " " + data["message"] + " " + data["errorId"]
                }, {
                    type: "warning",
                    delay: 900,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
        });

    }

    cancelEditLiveStream(): void {
        this.liveStreamEditing = null;
    }

    deleteLiveBroadcast(streamId: string): void {
        swal({
            title: Locale.getLocaleInterface().are_you_sure,
            text: Locale.getLocaleInterface().wont_be_able_to_revert,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(data => {
            this.restService.deleteBroadcast(this.appName, streamId)
                .subscribe(data => {
                    if (data["success"] == true) {

                    }
                    else {
                        $.notify({
                            icon: "ti-save",
                            message: Locale.getLocaleInterface().broadcast_not_deleted
                        }, {
                            type: "warning",
                            delay: 900,
                            placement: {
                                from: 'top',
                                align: 'right'
                            }
                        });
                    };
                    this.getAppLiveStreams();
                    this.getAppLiveStreamsOnce();


                    if(this.isGridView){
                        setTimeout(() => {
                            this.switchToGridView();
                        }, 500);
                    }



                });
        });

    }


    addNewStream(): void {
        if (!this.appSettings.encoderSettings) {
            this.appSettings.encoderSettings = [];
        }
        this.appSettings.encoderSettings.push({
            height: 0,
            videoBitrate: 0,
            audioBitrate: 0
        });
    }

    deleteStream(index: number): void {
        this.appSettings.encoderSettings.splice(index, 1);
    }

    setSocialNetworkChannel(serviceName: string, type: string, value: string): void {
        this.restService.setSocialNetworkChannel(this.appName, serviceName, type, value).subscribe(data => {
            console.log("set social network channel: " + data["success"]);
            if (data["success"]) {
                this.getFacebookChannel();
            }

        });
    }

    async showChannelChooserDialog(options: any, serviceName: string, type: string): Promise<boolean> {
        const { value: id } = await swal({
            title: 'Select The Page',
            input: 'select',
            inputOptions: options,
            inputPlaceholder: 'Select the Page',
            showCancelButton: true,
            inputValidator: (value) => {

                return new Promise((resolve) => {
                    if (value) {
                        console.log("selected id: " + value);

                        this.setSocialNetworkChannel(serviceName, type, value);

                        resolve();
                    }
                    else {
                        console.log("not item selected");
                        resolve()
                    }

                });

            },

        });

        return null;


    }
    showNetworkChannelList(serviceName: string, type: string): void {
        this.userFBPagesLoading = true;
        this.restService.getSocialNetworkChannelList(this.appName, serviceName, type).subscribe(data => {
            console.log(data);
            var options = {
            };

            for (var i in data) {
                options[data[i]["id"]] = data[i]["name"];
            }
            this.userFBPagesLoading = false;
            this.showChannelChooserDialog(options, serviceName, type);

        });

    }


    getFacebookChannel(): void {
        this.restService.getSocialNetworkChannel(this.appName, "facebook").subscribe(data => {
            console.log(data);
            this.socialMediaAuthStatus.facebookPublishChannel = new SocialNetworkChannel();
            this.socialMediaAuthStatus.facebookPublishChannel.id = data["id"];
            this.socialMediaAuthStatus.facebookPublishChannel.name = data["name"];
            this.socialMediaAuthStatus.facebookPublishChannel.type = data["type"];
        });
    }

    getSettings(): void {
        this.restService.getSettings(this.appName).subscribe(data => {
            this.appSettings = <AppSettings>data;
        });

        this.restService.checkDeviceAuthStatus(this.appName, "facebook").subscribe(data => {
            this.socialMediaAuthStatus.isFacebookAuthenticated = data["success"];

            if (this.socialMediaAuthStatus.isFacebookAuthenticated) {
                this.getFacebookChannel();
            }
        });

        this.restService.checkDeviceAuthStatus(this.appName, "youtube").subscribe(data => {
            this.socialMediaAuthStatus.isYoutubeAuthenticated = data["success"];
        });

        this.restService.checkDeviceAuthStatus(this.appName, "periscope").subscribe(data => {
            this.socialMediaAuthStatus.isPeriscopeAuthenticated = data["success"];
        });

    }


    changeSettings(valid: boolean): void {

        if (!valid) {
            return;
        }

        this.restService.changeSettings(this.appName, this.appSettings).subscribe(data => {
            if (data["success"] == true) {
                $.notify({
                    icon: "ti-save",
                    message: Locale.getLocaleInterface().settings_saved
                }, {
                    type: "success",
                    delay: 900,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
            else {
                $.notify({
                    icon: "ti-alert",
                    message: Locale.getLocaleInterface().settings_not_saved
                }, {
                    type: 'warning',
                    delay: 1900,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });

            }
        });
    }

    newLiveStream(): void {
        this.newLiveStreamActive = true;
        this.newIPCameraActive=false;
        this.newStreamSourceActive=false;
    }

    newIPCamera(): void {
        this.newLiveStreamActive = false;
        this.newIPCameraActive=true;
        this.newStreamSourceActive=false;
    }

    newStreamSource(): void {
        this.newLiveStreamActive = false;
        this.newIPCameraActive=false;
        this.newStreamSourceActive=true;
    }


    addIPCamera(isValid: boolean): void{

        if (!isValid) {
            //not valid form return directly
            return;
        }
        this.newIPCameraAdding = true;
        this.liveBroadcast.type="ipCamera";


        this.restService.addIPCamera(this.appName,this.liveBroadcast)
            .subscribe(data => {
                //console.log("data :" + JSON.stringify(data));
                if (data["success"] == true) {

                    this.newIPCameraAdding = false;

                    $.notify({
                        icon: "ti-save",
                        message: Locale.getLocaleInterface().new_broadcast_created
                    }, {
                        type: "success",
                        delay: 1000,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
                    this.getAppLiveStreams();
                    this.getAppLiveStreamsOnce();

                }
                else{

                    this.newIPCameraAdding = false;

                    $.notify({
                        icon: "ti-save",
                        message: "Error: Not added"
                    }, {
                        type: "error",
                        delay: 2000,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
                    this.getAppLiveStreams();
                    this.getAppLiveStreamsOnce();





                }



                //swal.close();
                this.newIPCameraAdding = false;
                this.newIPCameraActive=false;
                this.liveBroadcast.name="";
                this.liveBroadcast.ipAddr="";
                this.liveBroadcast.username="";
                this.liveBroadcast.password="";




                if(this.isGridView){
                    setTimeout(() => {
                        this.switchToGridView();
                    }, 500);
                }


            });

    }





    startDiscover() {
        this.discoveryStarted=true;
        this.onvifURLs=this.getDiscoveryList();
        this.noCamWarning=false;

        setTimeout(() =>
        {

            if(this.onvifURLs) {


                for (var i = 0; i < this.broadcastTableData.dataRows.length; i++) {
                    for (var j = 0; j < this.onvifURLs.length; j++) {

                        if (this.broadcastTableData.dataRows[i].type == "ipCamera") {

                            if (this.onvifURLs[j] == this.broadcastTableData.dataRows[i].ipAddr) {

                                console.log("found:  " + this.onvifURLs[j]);
                                // if camera is already registered then remove it from aray
                                var x = this.onvifURLs.indexOf(this.onvifURLs[j]);
                                this.onvifURLs.splice(x, 1);

                            }
                        }
                    }


                }

            }

            if(this.onvifURLs){

                //if all cameras are added, onvif array may still be alive, then length control should be done
                if(this.onvifURLs.length>0 ) {

                    console.log(this.onvifURLs[0]);


                    console.log(this.onvifURLs.length);


                    this.discoveryStarted = false;
                    swal({

                        type: 'info',
                        title: "Onvif Camera(s) ",
                        input: 'radio',
                        inputOptions: this.onvifURLs,
                        width: '355px',

                        inputValidator: function (value) {
                            return new Promise(function (resolve, reject) {
                                if (value !== '') {
                                    resolve();
                                } else {
                                    reject('Select Camera');
                                }
                            });

                        },


                    }).then((result) => {

                        if(result){
                            this.liveBroadcast.ipAddr = this.onvifURLs[result].toString();

                        }
                    })

                }else{

                    this.discoveryStarted = false;
                    this.noCamWarning=true;
                    this.camera.ipAddr="";

                }
            }else{

                this.discoveryStarted = false;
                this.noCamWarning=true;
                this.camera.ipAddr="";

            }


        }, 6000);


    }

    getDiscoveryList():String[] {

        this.onvifURLs=null;

        this.restService.autoDiscover(this.appName).subscribe(
            streams => {


                if (streams.length != 0){
                    this.onvifURLs = streams;
                    console.log('result: ' + this.onvifURLs[0]);
                }
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );





        return this.onvifURLs;
    }


    toConsole(val:string): void {

        console.log(val)

    }

    createLiveStream(isValid: boolean): void {

        if (!isValid) {
            //not valid form return directly
            return;
        }

        this.liveBroadcast.type="liveStream"

        var socialNetworks = [];

        if (this.liveBroadcastShareFacebook == true) {
            socialNetworks.push("facebook");
        }

        if (this.liveBroadcastShareYoutube == true) {
            socialNetworks.push("youtube");
        }

        if (this.liveBroadcastSharePeriscope == true) {
            socialNetworks.push("periscope");
        }


        this.newLiveStreamCreating = true;
        this.restService.createLiveStream(this.appName, this.liveBroadcast, socialNetworks.join(","))
            .subscribe(data => {
                //console.log("data :" + JSON.stringify(data));
                if (data["streamId"] != null) {

                    this.newLiveStreamActive = false;

                    $.notify({
                        icon: "ti-save",
                        message: Locale.getLocaleInterface().new_broadcast_created
                    }, {
                        type: "success",
                        delay: 900,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
                    this.getAppLiveStreams();
                    this.liveBroadcast.name = "";
                }

                this.newLiveStreamCreating = false;
                this.getAppLiveStreamsOnce();


                if(this.isGridView){
                    setTimeout(() => {
                        this.switchToGridView();
                    }, 500);
                }


            });

    }



    switchToListView():void {


        this.getAppLiveStreams();

        this.isGridView=false;

        var container = document.getElementById('cbp-vm'),
            optionSwitch = Array.prototype.slice.call(container.querySelectorAll('div.cbp-vm-options > a'));



        optionSwitch.forEach(function (el, i) {
            el.addEventListener('click', function () {

                change(this);



            }, );
        });


        function change(opt) {
            // remove other view classes and any selected option



            optionSwitch.forEach(function (el) {
                classie.remove(container, el.getAttribute('data-view'));
                classie.remove(el, 'cbp-vm-selected');
            });
            // add the view class for this option
            classie.add(container, opt.getAttribute('data-view'));
            // this option stays selected
            classie.add(opt, 'cbp-vm-selected');
        }

        // this.closeGridPlayers();

    }



    switchToGridView():void {

        this.getAppLiveStreams();

        this.isGridView=true;

        var container = document.getElementById('cbp-vm'),
            optionSwitch = Array.prototype.slice.call(container.querySelectorAll('div.cbp-vm-options > a'));





        optionSwitch.forEach(function (el, i) {
            el.addEventListener('click', function () {

                change(this);



            }, );
        });


        function change(opt) {
            // remove other view classes and any selected option


            optionSwitch.forEach(function (el) {
                classie.remove(container, el.getAttribute('data-view'));
                classie.remove(el, 'cbp-vm-selected');
            });
            // add the view class for this option
            classie.add(container, opt.getAttribute('data-view'));
            // this option stays selected
            classie.add(opt, 'cbp-vm-selected');
        }


        setTimeout(() => {
            this.openGridPlayers();
        }, 500);


    }

    setGettingParametersFalse(networkName: string): void {
        switch (networkName) {
            case "facebook":
                this.gettingFacebookParameters = false;
                break;
            case "youtube":
                this.gettingYoutubeParameters = false;
                break;
            case "periscope":
                this.gettingPeriscopeParameters = false;
                break;
        }
    }

    getSocialMediaAuthParameters(networkName: string): void {

        switch (networkName) {
            case "facebook":
                this.gettingFacebookParameters = true;
                break;
            case "youtube":
                this.gettingYoutubeParameters = true;
                break;
            case "periscope":
                this.gettingPeriscopeParameters = true;
                break;
        }


        this.restService.getDeviceAuthParameters(this.appName, networkName).subscribe(data => {

            if (data['verification_url']) {
                if (!data['verification_url'].startsWith("http")) {
                    data['verification_url'] = "http://" + data['verification_url'];
                }

                var message = Locale.getLocaleInterface().copy_this_code_and_enter_the_url.replace("CODE_KEY", data['user_code']);

                message = message.replace("URL_KEY", data['verification_url']); //this is for url
                message = message.replace("URL_KEY", data['verification_url']); //this is for string
                var typem = 'info';


                this.setGettingParametersFalse(networkName);
                swal({
                    html: message,
                    type: typem,
                    // showConfirmButton: false,
                    showCancelButton: true,
                    // width: '800px',
                    onOpen: function () {
                        console.log("onopen");

                    },
                    onClose: function () {
                        console.log("onclose");
                    }
                }).then(() => {
                    switch (networkName) {
                        case "facebook":
                            this.waitingForFacebookToBeAuthorized = true;
                            break;
                        case "youtube":
                            this.waitingForYoutubeToBeAuthorized = true;
                            break;
                        case "periscope":
                            this.waitingForPeriscopeToBeAuthorized = true;
                            break;
                    }
                    this.checkAuthStatus(networkName);

                })



            } else if (this.isEnterpriseEdition == false
                && data['errorId'] == ERROR_SOCIAL_ENDPOINT_UNDEFINED_ENDPOINT) {

                message = Locale.getLocaleInterface().notEnterprise;

                typem = 'error';
                this.setGettingParametersFalse(networkName);
                swal({
                    html: message,
                    type: typem,
                    // showConfirmButton: false,
                    showCancelButton: true,
                    // width: '800px',
                    onOpen: function () {
                        console.log("onopen");

                    },
                    onClose: function () {
                        console.log("onclose");
                    }
                });



            } else if (this.isEnterpriseEdition == true && data['errorId'] == ERROR_SOCIAL_ENDPOINT_UNDEFINED_CLIENT_ID) {

                message = Locale.getLocaleInterface().ketNotdefined;;


                typem = 'error';
                this.setGettingParametersFalse(networkName);
                swal({
                    html: message,
                    type: typem,
                    // showConfirmButton: false,
                    showCancelButton: true,
                    // width: '800px',
                    onOpen: function () {
                        console.log("onopen");

                    },
                    onClose: function () {
                        console.log("onclose");
                    }
                });
            }
        });
    }

    cancelNewLiveStream(): void {
        this.newLiveStreamActive = false;
    }

    cancelNewIPCamera(): void {
        this.newIPCameraActive = false;
    }

    cancelStreamSource(): void {
        this.newStreamSourceActive = false;
    }

    copyPublishUrl(streamUrl: string): void {
        this.clipBoardService.copyFromContent(this.getRtmpUrl(streamUrl), this.renderer);
        $.notify({
            message: Locale.getLocaleInterface().publish_url_copied_to_clipboard
        }, {
            type: "success",
            delay: 400,
            timer: 500,
            placement: {
                from: 'top',
                align: 'right'
            }
        });

    }

    copyLiveEmbedCode(streamUrl: string): void {

        //if (this.isEnterpriseEdition) {
        //  streamUrl += "_adaptive";
        //}

        let embedCode = '<iframe width="560" height="315" src="'
            + HTTP_SERVER_ROOT + this.appName + "/play.html?name=" + streamUrl
            + '" frameborder="0" allowfullscreen></iframe>';

        this.clipBoardService.copyFromContent(embedCode, this.renderer);
        $.notify({
            message: Locale.getLocaleInterface().embed_code_copied_to_clipboard
        }, {
            type: "success",
            delay: 400,
            timer: 500,
            placement: {
                from: 'top',
                align: 'right'
            }
        });
    }



    getRtmpUrl(streamUrl: string): string {
        return "rtmp://" + SERVER_ADDR + "/" + this.appName + "/" + streamUrl;
    }

    revokeSocialMediaAuth(networkName: string): void {
        this.restService.revokeSocialNetwork(this.appName, networkName)
            .subscribe(data => {
                if (data["success"] == true) {
                    if (networkName == "facebook") {
                        this.socialMediaAuthStatus.isFacebookAuthenticated = false;
                    }
                    else if (networkName == "youtube") {
                        this.socialMediaAuthStatus.isYoutubeAuthenticated = false;
                    }
                    else if (networkName == "periscope") {
                        this.socialMediaAuthStatus.isPeriscopeAuthenticated = false;
                    }
                }
            });
    }

    checkAuthStatus(networkName: string): void {

        this.restService.checkAuthStatus(networkName, this.appName).subscribe(data => {

            if (data["success"] != true) {
                this.checkAuthStatusTimerId = setTimeout(() => {
                    this.checkAuthStatus(networkName);
                }, 5000);
            }
            else {
                if (this.checkAuthStatusTimerId) {
                    clearInterval(this.checkAuthStatusTimerId);
                }
                if (networkName == "facebook") {
                    this.socialMediaAuthStatus.isFacebookAuthenticated = true;
                    this.gettingFacebookParameters = false;
                    this.waitingForFacebookToBeAuthorized = false;
                    this.getFacebookChannel();
                }
                else if (networkName == "youtube") {
                    this.socialMediaAuthStatus.isYoutubeAuthenticated = true;
                    this.gettingYoutubeParameters = false;
                    this.waitingForYoutubeToBeAuthorized = false;
                }
                else if (networkName == "periscope") {
                    this.socialMediaAuthStatus.isPeriscopeAuthenticated = true;
                    this.gettingPeriscopeParameters = false;
                    this.waitingForPeriscopeToBeAuthorized = false;
                }

                swal({
                    type: "success",
                    title: Locale.getLocaleInterface().congrats,
                    text: Locale.getLocaleInterface().authentication_is_done,
                });
            }
        });
    }

    filterVod(){

        this.searchWarning=false;


        if($("#start").val()){
            this.requestedStartDate= this.convertStartUnixTime($("#start").val());

        }else{
            this.requestedStartDate=0;

        }
        if($("#end").val()){
            this.requestedEndDate= this.convertEndUnixTime($("#end").val());

        }else{
            this.requestedEndDate=9999999999999;

        }

        this.searchParam.keyword=this.keyword;
        this.searchParam.endDate=this.requestedEndDate;
        this.searchParam.startDate=this.requestedStartDate;


        if(this.searchParam.endDate>this.searchParam.startDate){

            console.log("");



            this.restService.filterVod(this.appName, 0, 10,this.searchParam).subscribe(data  => {
                this.vodTableData.dataRows = [];
                for (var i in data) {
                    this.vodTableData.dataRows.push(data[i]);
                }

                console.log("filtered vod:  " +this.vodTableData.dataRows.length.toString());

                this.dataSourceVod = new MatTableDataSource(this.vodTableData.dataRows);
                this.vodLength= this.vodTableData.dataRows.length;
            });





        }else if (this.searchParam.endDate<this.searchParam.startDate){

            this.searchWarning=true;
        }
        console.log("search param start:  "+this.searchParam.startDate);
        console.log("search param end:  "+this.searchParam.endDate);
        console.log("search param keyword:  "+this.searchParam.keyword);

        console.log("req start: "+ this.requestedStartDate);
        console.log("req end: "+this.requestedEndDate);
        console.log("req keyword: "+this.keyword);

        if(!$("#keyword").val() || $("#keyword").val()==" " ){

            this.keyword=null;
        }





    }



    convertStartUnixTime(date:string){

        var d = date+'T00:00:00.000Z';

        var convertedTime=new Date(d).valueOf();
        console.log(new Date(d).valueOf());

        return convertedTime;

    }

    convertEndUnixTime(date:string){

        var d = date+'T23:59:59.000Z';

        var convertedTime=new Date(d).valueOf();
        console.log(new Date(d).valueOf());

        return convertedTime;

    }



    convertJavaTime(unixtimestamp:number){


        // Months array
        var months_arr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // Convert timestamp to milliseconds
        var date = new Date(unixtimestamp);

        // Year
        var year = date.getFullYear();

        // Month
        var month = months_arr[date.getMonth()];

        // Day
        var day = date.getDate();

        // Hours
        var hours = date.getHours();

        // Minutes
        var minutes = "0" + date.getMinutes();

        // Seconds
        var seconds = "0" + date.getSeconds();

        // Display date time in MM-dd-yyyy h:m:s format
        var convdataTime = month+'-'+day+'-'+year+' '+hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

        return convdataTime;

    }

    moveDown(camera:LiveBroadcast) {
        this.restService.moveDown(camera,this.appName).subscribe(
            result => {
                console.log('result!!!: ' + result);
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );
    }
    moveUp(camera:LiveBroadcast) {
        this.restService.moveUp(camera,this.appName).subscribe(
            result => {
                console.log('result!!!: ' + result);
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );
    }

    moveRight(camera:LiveBroadcast) {
        this.restService.moveRight(camera,this.appName).subscribe(
            result => {
                console.log('result!!!: ' + result);
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );
    }


    moveLeft(camera:LiveBroadcast) {
        this.restService.moveLeft(camera,this.appName).subscribe(
            result => {
                console.log('result!!!: ' + result);
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );
    }



}



/** Builds and returns a new User. */
function createNewUser(id: number): UserData {
    const name =
        NAMES[Math.round(Math.random() * (NAMES.length - 1))] + ' ' +
        NAMES[Math.round(Math.random() * (NAMES.length - 1))].charAt(0) + '.';

    return {
        id: id.toString(),
        name: name,
        progress: Math.round(Math.random() * 100).toString(),
        color: COLORS[Math.round(Math.random() * (COLORS.length - 1))]
    };
}

/** Constants used to fill up our data base. */
const COLORS = ['maroon', 'red', 'orange', 'yellow', 'olive', 'green', 'purple',
    'fuchsia', 'lime', 'teal', 'aqua', 'blue', 'navy', 'black', 'gray'];
const NAMES = ['Maia', 'Asher', 'Olivia', 'Atticus', 'Amelia', 'Jack',
    'Charlotte', 'Theodore', 'Isla', 'Oliver', 'Isabella', 'Jasper',
    'Cora', 'Levi', 'Violet', 'Arthur', 'Mia', 'Thomas', 'Elizabeth'];

export interface UserData {
    id: string;
    name: string;
    progress: string;
    color: string;
}

@Component({
    selector: 'dialog-overview-example-dialog',
    templateUrl: 'cam-settings-dialog.html',
})




export class CamSettinsDialogComponent {
    camera:LiveBroadcast;
    app:AppPageComponent;
    loading=false;

    constructor(
        public dialogRef: MatDialogRef<CamSettinsDialogComponent>, public restService: RestService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    submitDialog(){
        this.loading=true;

        console.log(this.dialogRef.componentInstance.data.status+this.dialogRef.componentInstance.data.id+this.dialogRef.componentInstance.data.name+this.dialogRef.componentInstance.data.url+this.dialogRef.componentInstance.data.username);


        this.camera=new LiveBroadcast();





        this.camera.name=this.dialogRef.componentInstance.data.name;
        this.camera.ipAddr=this.dialogRef.componentInstance.data.url;
        this.camera.username=this.dialogRef.componentInstance.data.username;
        this.camera.password=this.dialogRef.componentInstance.data.pass;
        this.camera.streamId=this.dialogRef.componentInstance.data.id;
        this.camera.status=this.dialogRef.componentInstance.data.status;



        this.restService.editCameraInfo(this.camera,this.dialogRef.componentInstance.data.appName).subscribe(data  => {

            if(data["success"] == true){

                this.dialogRef.close();
                swal({
                    type: "success",
                    title: "New Settings Saved!",
                    buttonsStyling: false,
                    confirmButtonClass: "btn btn-success"

                });

            }else {

                this.dialogRef.close();
                swal({
                    type: "error",
                    title: "An Error Occured!",

                    buttonsStyling: false,
                    confirmButtonClass: "btn btn-error"

                });



            }

        });




    }

}


@Component({
    selector: 'upload-vod-dialog',
    templateUrl: 'upload-vod-dialog.html',
})




export class UploadVodDialogComponent {

    app:AppPageComponent;
    loading=false;
    fileToUpload: File = null;
    search:SearchParam;

    constructor(
        public dialogRef: MatDialogRef<UploadVodDialogComponent>, public restService: RestService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    handleFileInput(files: FileList){

        this.fileToUpload = files.item(0);





    }



    submitUpload(){


        if(this.fileToUpload){

            let formData: FormData = new FormData();

            formData.append('file', this.fileToUpload);

            console.log("file upload"+this.fileToUpload.name);


            this.restService.uploadVod(this.fileToUpload.name,formData,"LiveApp").subscribe(data  => {

                if(data["success"] == true){

                    this.dialogRef.close();
                    swal({
                        type: "success",
                        title: " Saved!",
                        buttonsStyling: false,
                        confirmButtonClass: "btn btn-success"

                    });

                }else {

                    this.dialogRef.close();
                    swal({
                        type: "error",
                        title: "An Error Occured!",

                        buttonsStyling: false,
                        confirmButtonClass: "btn btn-error"

                    });



                }

            });

        }



    }

}





