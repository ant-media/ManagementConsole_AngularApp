import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    NgZone,
    OnDestroy,
    OnInit,
    Output,
    Renderer2,
    ViewChild
} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {ActivatedRoute, Router} from '@angular/router';
import {HTTP_SERVER_ROOT, LiveBroadcast, RestService} from '../rest/rest.service';
import {AuthService} from '../rest/auth.service';
import {ClipboardService} from 'ngx-clipboard';
import {Locale} from "../locale/locale";
import {MatDialog } from '@angular/material/dialog';
import {MatPaginator, MatPaginatorIntl, PageEvent} from "@angular/material/paginator"
import {MatTableDataSource} from "@angular/material/table"
import {MatSort} from "@angular/material/sort"
import "rxjs/add/operator/toPromise";
import {AppSettings, ServerSettings} from "./app.definitions";

import {
    BroadcastInfo,
    BroadcastInfoTable,
    CameraInfoTable,
    EncoderSettings,
    VideoServiceEndpoint,
    VodInfo,
    VodInfoTable,
    PlaylistItem
} from './app.definitions';
import {DetectedObjectListDialog} from './dialog/detected.objects.list';
import {UploadVodDialogComponent} from './dialog/upload-vod-dialog';
import {BroadcastEditComponent} from './dialog/broadcast.edit.dialog.component';
import {SocialMediaStatsComponent} from './dialog/social.media.stats.component';
import {WebRTCClientStatsComponent} from './dialog/webrtcstats/webrtc.client.stats.component';
import {RtmpEndpointEditDialogComponent} from './dialog/rtmp.endpoint.edit.dialog.component';
import {PlaylistEditComponent} from './dialog/playlist.edit.dialog.component';
import {Observable} from "rxjs";
import "rxjs/add/observable/of";
import {ClusterRestService} from "../rest/cluster.service";
import {
    ClusterInfoTable,
    ClusterNode,
    ClusterNodeInfo
} from '../cluster/cluster.definitions';

declare var $: any;
declare var Chartist: any;
declare var swal: any;
declare var classie: any;


const ERROR_SOCIAL_ENDPOINT_UNDEFINED_CLIENT_ID = -1;
const ERROR_SOCIAL_ENDPOINT_UNDEFINED_ENDPOINT = -2;

declare function require(name: string);


const LIVE_STREAMING_NOT_ENABLED = "LIVE_STREAMING_NOT_ENABLED";
const AUTHENTICATION_TIMEOUT = "AUTHENTICATION_TIMEOUT";

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
        public streamUrl: string,
        public type: string) { }
}

export class User {
    public newPassword: string;
    public fullName: string;
    constructor(
        public email: string,
        public password: string) {
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

export class Token {
    public tokenId: string;
    public streamId: string;
    public expireDate: number;
    public type:string;
}



@Component({
    selector: 'manage-app-cmp',
    moduleId: module.id,
    templateUrl: 'app.page.component.html',
    styleUrls: ['app.page.component.css'],


})


export class AppPageComponent implements OnInit, OnDestroy, AfterViewInit {

    public appName: string;
    public sub: any;
    public broadcastTableData: BroadcastInfoTable;
    public broadcastGridTableData: BroadcastInfoTable;
    public broadcastTempTable: BroadcastInfoTable;

    public gridTableData: CameraInfoTable;
    public vodTableData: VodInfoTable;
    public timerId: any;
    public camereErrorTimerId:any;
    public checkAuthStatusTimerId: any;
    public newLiveStreamActive: boolean;
    public newIPCameraActive: boolean;
    public newStreamSourceActive: boolean;
    public newPlaylistActive: boolean;
    public liveBroadcast: LiveBroadcast;
    public newLiveStreamCreating = false;
    public newIPCameraAdding = false;
    public newStreamSourceAdding = false;
    public newStreamSourceWarn = false;
    public newPlaylistAdding = false;
    public newPlaylistWarn = false;
    public discoveryStarted = false;
    public newSourceAdding = false;
    public isEnterpriseEdition = true;
    public isClusterMode = false;
    public filterValue = null;
    public filterValueVod = null;

    public gettingDeviceParameters = false;
    public waitingForConfirmation = false;

    public admin_check : boolean;
    public camera: Camera;
    public onvifURLs: String[];
    public newOnvifURLs: String[];
    public broadcastList: CameraInfoTable;
    public noCamWarning = false;
    public keyword: string;
    public startDate: string;
    public endDate: string;
    public requestedStartDate: number;
    public requestedEndDate: number;
    public searchWarning = false;
    public searchParam: SearchParam;
    public selectedBroadcast: LiveBroadcast;
    public showVodButtons = false;

    public userFBPagesLoading = false;
    public liveStreamEditing: LiveBroadcast;
    public liveStreamUpdating = false;
    public shareEndpoint: boolean[];
    public videoServiceEndpoints: VideoServiceEndpoint[];
    public streamUrlValid = true;
    public jwtTokenValid = true;
    public streamNameEmpty=false;
    public playlistNameEmpty=false;
    public encoderSettings:EncoderSettings[];
    public acceptAllStreams : boolean;
    public dropdownTimer: any;
    public enterpriseEditionText : any;
    public autoStart: false;
    public clusterNodes: ClusterNode[];
    public user: User;
    public currentClusterNode: string;


    public appSettings: AppSettings; // = new AppSettings(false, true, true, 5, 2, "event", "no clientid", "no fb secret", "no youtube cid", "no youtube secre", "no pers cid", "no pers sec");
    public token: Token;
    public serverSettings: ServerSettings;
    public listTypes = [
        new HLSListType('None', ''),
        new HLSListType('Event', 'event'),
    ];

    public displayedColumnsStreams = ['name' , 'status', 'viewerCount', 'actions'];
    public displayedColumnsVod = ['name', 'type', 'date', 'actions'];
    public displayedColumnsUserVod = ['name', 'date', 'actions'];

    public dataSource: MatTableDataSource<BroadcastInfo>;

    public dataSourceVod: MatTableDataSource<VodInfo>;

    public streamsPageSize = 10;
    public vodPageSize = 10;
    public pageSize = 10;
    public pageSizeOptions = [10, 25, 50];

    public streamsLength: number;
    public vodLength: any;
    public userVodLength: any;
    public gridLength: any;
    public listLength: any;

    public streamListOffset = 0;
    public vodListOffset = 0;

    public importingLiveStreams = false;
    public importingVoDStreams = false;
    private tokenData: Observable<Token>;
    // MatPaginator Output
    
    private vodSortBy = "";
    private vodOrderBy = "";

    private broadcastSortBy = "";
    private broadcastOrderBy = "";

    @ViewChild(MatPaginator, {static:false}) paginator: MatPaginator;
    @ViewChild(MatPaginator, {static:false}) paginatorVod: MatPaginator;
    
    public clusterNodeTableData: ClusterInfoTable;

    public nodeColumns = ['nodeIp', 'cpu', 'memory', 'lastUpdateTime', 'inTheCluster', 'actions'];

    public dataSourceNode: MatTableDataSource<ClusterNodeInfo>;

    @Input() pageEvent: PageEvent;

    @Output()
    pageChange: EventEmitter<PageEvent>;

    @ViewChild(MatSort) sort: MatSort;

    constructor(private route: ActivatedRoute,
                private restService: RestService,
                private clusterRestService: ClusterRestService,
                private clipBoardService: ClipboardService,
                private renderer: Renderer2,
                public router: Router,
                private zone: NgZone,
                public dialog: MatDialog,
                public sanitizer: DomSanitizer,
                private cdr: ChangeDetectorRef,
                private matpage: MatPaginatorIntl,
                private authService: AuthService,


    ) {
        this.dataSource = new MatTableDataSource<BroadcastInfo>();
        this.dataSourceVod = new MatTableDataSource<VodInfo>();
        this.dataSourceNode = new MatTableDataSource<ClusterNodeInfo>();
        this.videoServiceEndpoints = [];
    }

    setPageSizeOptions(setPageSizeOptionsInput: string) {
        this.pageSizeOptions = setPageSizeOptionsInput.split(',').map(str => +str);
    }

    ngOnInit() {

        

        this.timerId = null;
        this.dropdownTimer = null;

        this.broadcastTableData = {
            dataRows: [],
        };

        this.gridTableData = {
            list: []
        };

        this.vodTableData = {
            dataRows: []
        };

        this.broadcastTempTable = {
            dataRows: [],
        };

        this.broadcastGridTableData = {
            dataRows: [],
        };

        this.clusterNodeTableData = {
            dataRows: [],
        };



        this.liveBroadcast = new LiveBroadcast();
        this.selectedBroadcast = new LiveBroadcast();
        this.liveBroadcast.name = "";
        this.liveBroadcast.type = "";
        this.searchParam = new SearchParam();
        this.appSettings = null;
        this.token = null;
        this.newLiveStreamActive = false;
        this.camera = new Camera("", "", "", "", "", "");

        this.getInitParams();

        this.callTimer();

    }

    contextDropdownClicked(){

        this.clearTimer();

        this.dropdownTimer = window.setInterval( () => {
            if(this.authService.isAuthenticated) {
                if(this.appName != "undefined"){
                    this.callTimer();
                }
            }
        }, 8000);
    }

    callTimer(){

        console.log("Timer Started");

        this.clearTimer();

        //this timer gets the related information according to active application
        //so that it checks appname whether it is undefined
            this.timerId = window.setInterval(() => {
            if(this.authService.isAuthenticated) {
                if(this.appName != "undefined"){
                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.getVoDStreams();
                    this.getAppLiveStreamsNumber();
                }
            }

            }, 5000);
    }

    onPaginateChange(event) {


        console.log("page index:" + event.pageIndex);
        console.log("length:" + event.length);
        console.log("page size:" + event.pageSize);

        this.vodListOffset = event.pageIndex * event.pageSize;

        this.pageSize = event.pageSize;

        this.keyword = null;

        this.restService.getVodList(this.appName, this.vodListOffset, this.pageSize, this.vodSortBy, this.vodOrderBy,this.filterValueVod).subscribe(data => {
            this.vodTableData.dataRows = [];
            for (var i in data) {
                this.vodTableData.dataRows.push(data[i]);
            }

            this.dataSourceVod = new MatTableDataSource(this.vodTableData.dataRows);


        });
    }

    onListPaginateChange(event) {


        console.log("list page index:" + event.pageIndex + " length:" + event.length + " page size:" + event.pageSize);

        this.pageSize = event.pageSize;
        this.streamListOffset = event.pageIndex;

        this.getAppLiveStreams(this.streamListOffset, this.pageSize);
    }

    onGridPaginateChange(event) {
        console.log("grid page index:" + event.pageIndex + " length:" + event.length + " page size:" + event.pageSize);

        this.pageSize = event.pageSize;

        this.openGridPlayers(event.pageIndex, this.pageSize);

    }

    ngAfterViewInit() {
        this.cdr.detectChanges();

    }

    getInitParams (){
	
        this.sub = this.route.params.subscribe(params => {
            //this method is called whenever app changes

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

            this.broadcastOrderBy = "";
            this.broadcastSortBy = "";
            this.vodOrderBy = "";
            this.vodSortBy = "";

            this.getSettings();

            this.restService.isEnterpriseEdition().subscribe(data => {
                this.isEnterpriseEdition = data["success"];
            });

			this.restService.isAdmin().subscribe(data => {
	            console.log(data);
	            if(data["success"] == true){
	                this.admin_check = true;
	            }
	            else{
	                this.admin_check = false;
	            }
        	});

            this.restService.isInClusterMode().subscribe(data => {
                this.isClusterMode = data["success"];
                if (this.isClusterMode) {
                    var clusterNodeCount = 0;
                    this.clusterRestService.getClusterNodeCount().subscribe( data => {
                        clusterNodeCount = data["number"];
                        this.clusterRestService.getClusterNodes(0, clusterNodeCount).subscribe(data => {
                            this.clusterNodeTableData.dataRows = [];
                            for (let i in data) {
                                if(data[i].status == "alive") {
                                    this.currentClusterNode = data[0].ip;
                                    this.clusterNodeTableData.dataRows.push(data[i]);
                                }
                            }
                        });
                    });
                }
            });
            this.getAppLiveStreamsNumber();
            this.getVoDStreams();
            this.getAppLiveStreams(0, this.pageSize);
        });

    }

    changeApplication() {
        this.clearTimer();
        this.getAppLiveStreamsNumber();
        this.getVoDStreams();
        this.getAppLiveStreams(0, this.pageSize);
    }

    applyFilter(filterValue: string) {
        if(this.filterValue != filterValue){
            this.filterValue = filterValue.toLowerCase(); // Datasource defaults to lowercase matches
            this.getAppLiveStreamsNumber();
            this.paginator.firstPage();
            this.getAppLiveStreams(0, this.pageSize);  
        }
    }

    applyFilterVod(filterValue: string) {
        this.filterValueVod = filterValue.toLowerCase(); // Datasource defaults to lowercase matches
        this.vodListOffset = 0;
        this.getVoDStreams();
        this.paginator.firstPage();
    }

    openSettingsDialog(selected: LiveBroadcast): void {

        this.selectedBroadcast = selected;

        let dialogRef = this.dialog.open(BroadcastEditComponent, {
            width: '450px',
            data: {
                name: this.selectedBroadcast.name,
                url: this.selectedBroadcast.ipAddr,
                username: this.selectedBroadcast.username,
                pass: this.selectedBroadcast.password,
                streamId: this.selectedBroadcast.streamId,
                status: this.selectedBroadcast.status,
                type: this.selectedBroadcast.type,
                streamUrl: this.selectedBroadcast.streamUrl,
                appName: this.appName,
                webRTCViewerLimit: this.selectedBroadcast.webRTCViewerLimit,
                hlsViewerLimit: this.selectedBroadcast.hlsViewerLimit,
                endpointList: selected.endPointList,
                videoServiceEndpoints: this.videoServiceEndpoints,
            }
        });


        dialogRef.afterClosed().subscribe(result => {
            console.log('The dialog was closed');
            this.getAppLiveStreams(this.streamListOffset, this.pageSize);
            this.getAppLiveStreamsNumber();

        });
    }

    showLiveComments(broadcast: LiveBroadcast): void {
        this.dialog.open(SocialMediaStatsComponent, {
            width: '90%',
            data: {
                appName: this.appName,
                streamName: broadcast.name,
                streamId: broadcast.streamId,
                endpointList: broadcast.endPointList,
            },
            disableClose: true,
        });
    }


    openStreamSourceSettingsDialog(selected: LiveBroadcast): void {

        this.selectedBroadcast = selected;

        let dialogRef = this.dialog.open(BroadcastEditComponent, {
            width: '450px',
            data: {
                name: this.selectedBroadcast.name,
                url: this.selectedBroadcast.ipAddr,
                streamId: this.selectedBroadcast.streamId,
                status: this.selectedBroadcast.status,
                type: this.selectedBroadcast.type,
                appName: this.appName,
                webRTCViewerLimit: this.selectedBroadcast.webRTCViewerLimit,
                hlsViewerLimit: this.selectedBroadcast.hlsViewerLimit,
                streamUrl:this.selectedBroadcast.streamUrl,
                endpointList: selected.endPointList,
                videoServiceEndpoints: this.videoServiceEndpoints,
            }
        });


        dialogRef.afterClosed().subscribe(result => {
            console.log('The dialog was closed');
            this.getAppLiveStreams(this.streamListOffset, this.pageSize);
            this.getAppLiveStreamsNumber();

        });
    }

    hasSocialEndpoint(broadcast: LiveBroadcast): boolean {
        let hasEndpoint: boolean = false;

        if (broadcast.endPointList) {
            for (let item of broadcast.endPointList) {
                if (item.endpointServiceId) {
                    hasEndpoint = true;
                    break;
                }
            }
        }
        return hasEndpoint;
    }


    openVodUploadDialog(): void {

        let dialogRef = this.dialog.open(UploadVodDialogComponent, {
            data: { appName: this.appName },
            width: '640px'

        });

        dialogRef.afterClosed().subscribe(result => {
            console.log('The dialog was closed');
            this.getVoDStreams();
        });
    }


    openBroadcastEditDialog(stream: BroadcastInfo): void {

        this.liveStreamEditing = new LiveBroadcast();
        this.liveStreamEditing.streamId = stream.streamId;
        this.liveStreamEditing.name = stream.name;
        this.liveStreamEditing.webRTCViewerLimit = stream.webRTCViewerLimit;
        this.liveStreamEditing.hlsViewerLimit = stream.hlsViewerLimit;
        this.liveStreamEditing.description = "";

        if (this.liveStreamEditing) {
            let dialogRef = this.dialog.open(BroadcastEditComponent, {
                data: {
                    name: this.liveStreamEditing.name,
                    streamId: this.liveStreamEditing.streamId,
                    type: this.liveStreamEditing.type,
                    appName: this.appName,
                    webRTCViewerLimit: this.liveStreamEditing.webRTCViewerLimit,
                    hlsViewerLimit: this.liveStreamEditing.hlsViewerLimit,
                    endpointList: stream.endPointList,                    
                    videoServiceEndpoints: this.videoServiceEndpoints,
                    // ************** TODO: open it *************************
                    //socialMediaAuthStatus:this.socialMediaAuthStatus
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                console.log('The dialog was closed');
                this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                this.getAppLiveStreamsNumber();
            });
        }
    }

    openPlaylistEditDialog(stream: BroadcastInfo): void {

            let dialogRef = this.dialog.open(PlaylistEditComponent, {
                width: '640px',
                data: {
                    streamId: stream.streamId,
                    appName: this.appName,
                }
            });


            dialogRef.afterClosed().subscribe(result => {
                console.log('The dialog was closed');
                this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                this.getAppLiveStreamsNumber();
            });
    }


    test() {
        alert("test");
    }

    getAppLiveStreams(offset: number, size: number): void {
        
        offset = offset * size;

        this.restService.getAppLiveStreams(this.appName, offset, size, this.broadcastSortBy, this.broadcastOrderBy,this.filterValue).subscribe(data => {

            this.broadcastTableData.dataRows = [];

            for (var i in data) {

                var endpoint = [];
                for (var j in data[i].endPointList) {
                    endpoint.push(data[i].endPointList[j]);
                }
                this.broadcastTableData.dataRows.push(data[i]);

                this.broadcastTableData.dataRows[i].iframeSource = HTTP_SERVER_ROOT + this.appName + "/play.html?name=" + this.broadcastTableData.dataRows[i].streamId + "&autoplay=true";

            }

            this.dataSource = new MatTableDataSource(this.broadcastTableData.dataRows);
            console.log(this.dataSource)
            this.cdr.detectChanges();

        });

    }
   

    cleanURL(oldURL: string): SafeResourceUrl {
        console.log("clean url");
        return this.sanitizer.bypassSecurityTrustResourceUrl(oldURL);
    }

    getAppLiveStreamsNumber(): void {
        this.restService.getTotalBroadcastNumber(this.appName, this.filterValue).subscribe(
            data => {

                this.listLength = data["number"];
            });
        
        this.cdr.detectChanges();
    }

    sortVodList(e) {

        //This sort function need for the e.direction null value
        this.vodOrderBy = this.sortOrderBy(e.direction, this.vodOrderBy);

        // save cookie with table sort data here
        this.vodSortBy = e.active;

        this.getVoDStreams();
        console.log("vodSortBy->" + this.vodSortBy);
        console.log("vodOrderBy->"+ this.vodOrderBy);
    }

    sortBroadcastList(e) {
        //This sort function need for the e.direction null value
        this.broadcastOrderBy = this.sortOrderBy(e.direction, this.broadcastOrderBy);

        // save cookie with table sort data here
        this.broadcastSortBy = e.active;

        this.getAppLiveStreams(this.streamListOffset, this.pageSize);
        console.log("broadcastSortBy->" + this.broadcastSortBy);
        console.log("broadcastOrderBy->"+ this.broadcastOrderBy);
    }

    sortOrderBy(sortDirection: string, orderBy: string): string{
        if((sortDirection == "" || orderBy == sortDirection) && orderBy == "asc" ){
            orderBy = "desc";
        }
        else if((sortDirection == "" || orderBy == sortDirection) && orderBy == "desc" ){
            orderBy = "asc";
        }
        else{
            orderBy = sortDirection;
        }
        return orderBy;
    }

    getVoDStreams(): void {

        this.searchWarning = false;
        this.keyword = null;

        //this for getting full length of vod streams for paginations

        this.restService.getTotalVodNumber(this.appName, this.filterValueVod).subscribe(data => {
            this.vodLength = data["number"];
        });


        this.restService.getVodList(this.appName, this.vodListOffset, this.pageSize, this.vodSortBy, this.vodOrderBy, this.filterValueVod).subscribe(data => {
            this.vodTableData.dataRows = [];
            for (var i in data) {
                this.vodTableData.dataRows.push(data[i]);
            }
            this.dataSourceVod = new MatTableDataSource(this.vodTableData.dataRows);
        });
    }

    clearTimer() {

        clearInterval(this.timerId);
        clearInterval(this.dropdownTimer);

        this.timerId = null ;
        this.dropdownTimer = null ;

    }

    ngOnDestroy() {
        this.sub.unsubscribe();
        this.clearTimer();
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

    showDetectedObject(streamId: string): void {
        let dialogRef = this.dialog.open(DetectedObjectListDialog, {
            width: '500px',
            data: {
                streamId: streamId,
                appName: this.appName
            }
        });


    }

    getIFrameSrc(streamId:string, autoplay:string, token:string):string {
        return  HTTP_SERVER_ROOT + this.appName + "/play.html?name=" + streamId +"&autoplay="+autoplay +
                (token != null ? "&token=" + token : "");
    }

    getIFrameEmbedCode(streamId:string): string {
        return '<iframe id="' + streamId + '" frameborder="0" allowfullscreen="true" class = "frame" seamless="seamless" style="display:block; width:100%; height:480px"  ></iframe>';
    }

    playLive(streamId: string): void {
        if(this.appSettings.playTokenControlEnabled) 
        {
            this.openPlayerWithOneTimeToken(streamId, streamId,"640px", streamId);
        }
        if(this.appSettings.playJwtControlEnabled)
        {
            this.openPlayerWithJWTToken(streamId, streamId,"640px", streamId);
        }
        else 
        {
            this.openPlayer(this.getIFrameEmbedCode(streamId), streamId, streamId, "640px", null);    
        }
    }

    openPlayer(htmlCode:string, objectId:string, streamId: string, width: string, tokenId:string):void {

        swal({
            html: htmlCode,
            showConfirmButton: false,
            width: width,
            padding:"10px" ,
            animation: false,
            showCloseButton: true,
            onOpen: () => {    
              //the error in this callback does not show up in browser console.
              var iframe = $('#' + objectId);
              iframe.prop('src', this.getIFrameSrc(streamId, "true", tokenId));
            },
            onClose: function () {
                var ifr = document.getElementById(objectId);
                ifr.parentNode.removeChild(ifr);
            }
        })
        .then(function () { }, function () { })
        .catch(function () {
        });
    }

    openGridPlayers(index: number, size: number): void {
        var id;


        index = index * size;

        this.restService.getAppLiveStreams(this.appName, index, size, this.broadcastSortBy, this.broadcastOrderBy, null).subscribe(data => {
            //console.log(data);
            this.broadcastGridTableData.dataRows = [];

            for (var i in data) {
                var endpoint = [];
                for (var j in data[i].endPointList) {
                    endpoint.push(data[i].endPointList[j]);
                }
                this.broadcastGridTableData.dataRows.push(data[i]);
            }
        });

        setTimeout(() => {

            for (var i in this.broadcastGridTableData.dataRows) {
                id = this.broadcastGridTableData.dataRows[i]['streamId'];
                var $iframe = $('#' + id);
                $iframe.prop('src',  this.getIFrameSrc(id, "true", null));
            }

        }, 1500);
    }

    downloadFile(vodName: string, type: string, vodId:string, streamId:string): void {

        var srcFile = null;
        var vodUrlName = null;

        if (type == "uploadedVod") {
            srcFile = HTTP_SERVER_ROOT + this.appName + '/streams/' + vodId + '.mp4'  ;
            vodUrlName = vodId ;
        }else if (type == "streamVod"){
            srcFile = HTTP_SERVER_ROOT + this.appName + '/streams/' + vodName;
            vodUrlName = vodName ;
        }else if (type == "userVod") {
            var lastSlashIndex = this.appSettings.vodFolder.lastIndexOf("/");
            var folderName = this.appSettings.vodFolder.substring(lastSlashIndex);
            srcFile = HTTP_SERVER_ROOT + this.appName + '/streams' + folderName + '/' + vodName;
            vodUrlName = vodName ;
        }

        const link = document.createElement("a");
        link.download = vodUrlName;
        document.body.appendChild(link);
        link.href = srcFile;
        link.target = '_blank';
        link.click();
    }


    playVoD(vodName: string, type: string, vodId:string, streamId:string, filePath:string): void {

        if(this.appSettings.playTokenControlEnabled || this.appSettings.playJwtControlEnabled){
            this.playVoDToken(vodName, type, vodId, streamId, filePath);
        }
        else {
            this.openPlayer(this.getIFrameEmbedCode(vodId), vodId, filePath, "640px", null);
        }
    }

    playVoDToken(name: string, type: string, vodId:string, streamId:string, filePath:string):void
    {
        let tokenParam;
        
        if(type == "uploadedVod" ){
            tokenParam = vodId;
        }
        else if (type == "streamVod" ) {
            tokenParam = streamId;
        }
        else if (type == "userVod" ) {
            let extensionIndex = name.lastIndexOf(".mp4");
            tokenParam = name.substring(0, extensionIndex);
        }

        if (tokenParam != null && this.appSettings.playTokenControlEnabled) {
            this.openPlayerWithOneTimeToken(vodId, filePath,"640px", tokenParam);
        }
        else if (tokenParam != null && this.appSettings.playJwtControlEnabled) {
            this.openPlayerWithJWTToken(vodId, filePath,"640px", tokenParam);
        }
        else {
            swal({
                title: "Undefined VoD Type",
                text: "It cannot get token for Undefined VoD type",
                type: 'error',

                confirmButtonColor: '#3085d6',
                confirmButtonText: 'OK'
            }).then(() => {
            }).catch(function () {
            });
        }
    }


    openPlayerWithOneTimeToken(id: string, path: string,width: string, tokenParam:string){
        let currentUnixTime : number = Math.floor(Date.now() / 1000)
        let expireDate : number = currentUnixTime + 100;

        this.restService.getOneTimeToken (this.appName, tokenParam, expireDate).subscribe(data => {
            this.token = <Token>data;
            this.openPlayer(this.getIFrameEmbedCode(id), id, path, "640px", this.token.tokenId)
        });
    }

    openPlayerWithJWTToken(id: string, path: string,width: string, tokenParam:string){
        let currentUnixTime : number = Math.floor(Date.now() / 1000)
        let expireDate : number = currentUnixTime + 100;

        this.restService.getJWTToken(this.appName, tokenParam, expireDate).subscribe(data => {
            this.token = <Token>data;
            this.openPlayer(this.getIFrameEmbedCode(id), id, path, "640px", this.token.tokenId)
        });
    }

    deleteVoD(fileName: string, vodId: number, type: string): void {
        swal({
            title: Locale.getLocaleInterface().are_you_sure,
            text: Locale.getLocaleInterface().wont_be_able_to_revert,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(() => {

            this.restService.deleteVoDFile(this.appName, fileName, vodId, type).subscribe(data => {
                if (data["success"] == true) {

                    $.notify({
                        icon: "ti-save",
                        message: Locale.getLocaleInterface().vod_deleted
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
                    this.showVoDFileNotDeleted();
                }
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

        this.restService.updateLiveStream(this.appName, this.liveStreamEditing,
            socialNetworks).subscribe(data => {
            this.liveStreamUpdating = false;
            console.log(data["success"]);
            if (data["success"]) {
                this.liveStreamEditing = null;
                //update the rows
                this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                this.getAppLiveStreamsNumber();
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
                    message: Locale.getLocaleInterface().broadcast_not_updated + " " + data["message"] + " " + data["errorId"]
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



    deleteLiveBroadcast(streamId: string, broadcastHostAddress: string, type:string, broadcastStatus: string): void {
        let REMOTE_HOST_ADDRESS;
        let hostAddress = localStorage.getItem('hostAddress');

        // I didn't added broadcast status check. Because, some of stream sources status is finished but it's trying to connect sources.
        //But we need to add broadcast status check for live stream type.
        if((this.isClusterMode && hostAddress != broadcastHostAddress) && (type != "liveStream" && broadcastStatus == "broadcasting")) {
            REMOTE_HOST_ADDRESS = "http://" + broadcastHostAddress + ":5080";

            if(this.appSettings.jwtControlEnabled != true && this.appSettings.jwtSecretKey != null){
                $.notify({
                    icon: "ti-save",
                    message: "Please enable JWT Filter or Delete Broadcast in a stopped status"
                }, {
                    type: "danger",
                    delay: 2000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
                return;
            }
        }

        swal({
            title: Locale.getLocaleInterface().are_you_sure,
            text: Locale.getLocaleInterface().wont_be_able_to_revert,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then(data => {
            this.restService.deleteBroadcast(this.appName, streamId,REMOTE_HOST_ADDRESS)
                .subscribe(data => {
                    if (data["success"] == true) {

                        $.notify({
                            icon: "ti-save",
                            message: "Successfully deleted"
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
                    }
                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.getAppLiveStreamsNumber();


                });
        });

    }


    addNewStream(): void {

        if (!this.encoderSettings) {
            this.encoderSettings = [];
        }

        this.encoderSettings.push({
            height: 0,
            videoBitrate: 0,
            audioBitrate: 0
        });

    }

    clusterDropDownChanged(selectedNode:string){
        if(this.currentClusterNode != selectedNode){
            this.currentClusterNode = selectedNode;
        }
    }
    dropDownChanged(event:any,i:number){

        if (event == 2160) {
            this.encoderSettings[i].videoBitrate = 6000;
            this.encoderSettings[i].audioBitrate = 256;
        }
        if(event == 1080) {
            this.encoderSettings[i].videoBitrate = 2000;
            this.encoderSettings[i].audioBitrate = 256;
        }
        if(event == 720) {
            this.encoderSettings[i].videoBitrate = 1500;
            this.encoderSettings[i].audioBitrate = 128;
        }
        if(event == 480) {
            this.encoderSettings[i].videoBitrate = 1000;
            this.encoderSettings[i].audioBitrate = 96;
        }
        if(event == 360) {
            this.encoderSettings[i].videoBitrate = 800;
            this.encoderSettings[i].audioBitrate = 64;
        }
        if(event == 240) {
            this.encoderSettings[i].videoBitrate = 500;
            this.encoderSettings[i].audioBitrate = 32;
        }


    }

    deleteStream(index: number): void {
        this.encoderSettings.splice(index, 1);
    }

    getSettings(): void {
        this.restService.getSettings(this.appName).subscribe(data => {
            this.appSettings = <AppSettings>data;

            if(this.appSettings.jwtControlEnabled){
                let jwt = require('jsonwebtoken');
                let currentAppJWTToken = jwt.sign({ sub: "token" }, this.appSettings.jwtSecretKey);

                localStorage.setItem(this.appName+'jwtToken', currentAppJWTToken);
                localStorage.setItem(this.appName+'jwtControlEnabled', this.appSettings.jwtControlEnabled+"");
            }
            else{
                localStorage.setItem(this.appName+'jwtToken', null);
                localStorage.setItem(this.appName+'jwtControlEnabled', "false");
            }
            this.encoderSettings = [];
            this.appSettings.encoderSettings.forEach((value, index) => {
                if (value != null ) {
                    this.encoderSettings.push({
                        height: this.appSettings.encoderSettings[index].height,
                        videoBitrate: this.appSettings.encoderSettings[index].videoBitrate / 1000,
                        audioBitrate: this.appSettings.encoderSettings[index].audioBitrate / 1000
                    });

                }
            });

            this.acceptAllStreams = !this.appSettings.acceptOnlyStreamsInDataStore ;


        });
    }


    changeSettings(valid: boolean): void {

        if (!valid) {
            return;
        }


        if(this.appSettings.jwtControlEnabled){
            let jwt = require('jsonwebtoken');
            let currentAppJWTToken = jwt.sign({ sub: "token" }, this.appSettings.jwtSecretKey);

            localStorage.setItem(this.appName+'jwtToken', currentAppJWTToken);
            localStorage.setItem(this.appName+'jwtControlEnabled', this.appSettings.jwtControlEnabled+"");
        }
        else{
            localStorage.setItem(this.appName+'jwtToken', null);
            localStorage.setItem(this.appName+'jwtControlEnabled', "false");
        }

        this.appSettings.encoderSettings = [];

        this.encoderSettings.forEach((value, index) => {
            if (value != null ) {
                this.appSettings.encoderSettings.push({
                    height: this.encoderSettings[index].height,
                    videoBitrate: this.encoderSettings[index].videoBitrate * 1000,
                    audioBitrate: this.encoderSettings[index].audioBitrate * 1000
                });

            }
        });

        this.appSettings.remoteAllowedCIDR = this.appSettings.remoteAllowedCIDR.trim();

        if(this.appSettings.remoteAllowedCIDR == ""){
        this.appSettings.remoteAllowedCIDR = "127.0.0.1";
        }

        this.appSettings.acceptOnlyStreamsInDataStore = !this.acceptAllStreams ;

        if (this.appSettings.vodFolder.endsWith("/")) {
            this.appSettings.vodFolder = this.appSettings.vodFolder.substring(0, this.appSettings.vodFolder.length - 1);
        }

        this.restService.changeSettings(this.appName, this.appSettings).subscribe(data => {
            if (data["success"] == true) {
                $.notify({
                    icon: "ti-save",
                    message: Locale.getLocaleInterface().settings_saved
                }, {
                    type: "success",
                    delay: 3000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            } else {
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

            this.appSettings.encoderSettings.forEach((value, index) => {
                if (value != null ) {
                    this.appSettings.encoderSettings[index].videoBitrate /= 1000 ;
                    this.appSettings.encoderSettings[index].audioBitrate /= 1000 ;
                }
            });

        });


    }

    newLiveStream(): void {
        this.shareEndpoint = [];
        this.newLiveStreamActive = true;
        this.newIPCameraActive = false;
        this.newStreamSourceActive = false;
        this.streamNameEmpty = false;
        this.liveBroadcast = new LiveBroadcast();
    }

    newIPCamera(): void {
        this.shareEndpoint = [];
        this.newLiveStreamActive = false;
        this.newIPCameraActive = true;
        this.newStreamSourceActive = false;
        this.streamNameEmpty = false;
        this.liveBroadcast = new LiveBroadcast();
    }

    newStreamSource(): void {
        this.shareEndpoint = [];
        this.newLiveStreamActive = false;
        this.newIPCameraActive = false;
        this.newStreamSourceActive = true;
        this.streamNameEmpty = false;
        this.liveBroadcast = new LiveBroadcast();
    }

    newPlaylist(): void {
        this.newLiveStreamActive = false;
        this.newIPCameraActive = false;
        this.newStreamSourceActive = false;
        this.newPlaylistActive = true;
        this.streamNameEmpty = false;
        this.liveBroadcast = new LiveBroadcast();
    }


    checkIPCameraError(streamId:string): void {
       
            this.restService.getCameraError(this.appName , streamId) .subscribe(data => {

                console.log("stream ID :  "+ streamId);

                if(data["success"] == false){

                    if (data["message"] != null && data["message"].includes("401")) {

                        swal({
                            title: "Authorization Error",
                            text: "Please Check Username and/or Password",
                            type: 'error',

                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'OK'
                        }).then(() => {

                        }).catch(function () {

                        });
                    }
                    else {
                        swal({
                            title: "Camera Error",
                            text: "An unknown error occured for your IP Camera. Please report this case to support@antmedia.io with your logs and IP camera address",
                            type: 'error',

                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'OK'
                        }).then(() => {

                        }).catch(function () {

                        });
                    }
                }
                else{
                    console.log("no  camera error")
                }

                this.liveBroadcast.ipAddr = "";
            });
    }


    addIPCamera(isValid: boolean): void {
        this.streamNameEmpty = false;

        if (!isValid) {
            //not valid form return directly
            return;
        }

        if (!this.restService.checkStreamName(this.liveBroadcast.name)){
            this.streamNameEmpty = true;
            return;
        }
        this.newIPCameraAdding = true;
        this.liveBroadcast.type = "ipCamera";


        var socialNetworks = [];

        this.shareEndpoint.forEach((value, index) => {
            if (value === true) {
                socialNetworks.push(this.videoServiceEndpoints[index].id);
            }
        });
        this.restService.createLiveStream(this.appName, this.liveBroadcast,null, socialNetworks.join(","))
            .subscribe(data => {
                //console.log("data :" + JSON.stringify(data));
                this.newIPCameraAdding = false;
                if (data["success"] == true) {

                    console.log("success: " + data["success"]);
                    console.log("error: " + data["message"]);

                    this.newIPCameraActive = false;
        
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
                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.getAppLiveStreamsNumber();

                    //call 5 seconds later to let IP camera start
                    setTimeout(() => {
                        this.checkIPCameraError(data["dataId"]);
                    }, 5000);    
                }
                else {

                    console.log("success: " + data["success"]);
                    console.log("message: " + data["message"]);

                    var errorCode = data["errorId"];
                    if (errorCode == -1) {

                        swal({
                            title: "Connection Error",
                            text: "Please Check Camera URL",
                            type: 'error',

                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'OK'
                        }).then(() => {


                        }).catch(function () {

                        });
                    }
                    else if (errorCode == -2) {

                        swal({
                            title: "Authorization Error",
                            text: "Please Check Username and/or Password",
                            type: 'error',

                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'OK'
                        }).then(() => {


                        }).catch(function () {

                        });
                    }
                    else if (errorCode == -3) {

                        swal({
                            title: "High CPU Load",
                            text: "Please Decrease CPU Load Then Try Again",
                            type: 'error',

                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'OK'
                        }).then(() => {


                        }).catch(function () {

                        });
                    }

                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.getAppLiveStreamsNumber();
                }
            });
    }

    addStreamSource(isValid: boolean): void {

        this.streamNameEmpty = false;

        if (!isValid) {
            //not valid form return directly
            return;
        }


        if (!this.restService.checkStreamName(this.liveBroadcast.name)) {
            this.streamNameEmpty = true;
            return;
        }

        if(!this.restService.checkStreamUrl(this.liveBroadcast.streamUrl)){
            console.log("stream source address is not in correct format");
            this.streamUrlValid=false;
            return;
        }
        this.streamNameEmpty = false;
        this.newStreamSourceAdding = true;
        this.liveBroadcast.type = "streamSource";

        var socialNetworks = [];
        this.shareEndpoint.forEach((value, index) => {
            if (value === true) {
                socialNetworks.push(this.videoServiceEndpoints[index].id);
            }
        });

        let REMOTE_HOST_ADDRESS = null;
        let hostAddress = localStorage.getItem('hostAddress');
        if(this.isClusterMode && hostAddress != this.currentClusterNode) {
            REMOTE_HOST_ADDRESS = "http://" + this.currentClusterNode + ":5080";

            if(this.appSettings.jwtControlEnabled != true && this.appSettings.jwtSecretKey == null){
                $.notify({
                    icon: "ti-save",
                    message: "Please enable JWT Filter or Delete Broadcast in a stopped status"
                }, {
                    type: "danger",
                    delay: 2000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
                return;
            }
        }

        this.restService.createLiveStream(this.appName, this.liveBroadcast, REMOTE_HOST_ADDRESS, socialNetworks.join(","))
            .subscribe(data => {
                if (data["success"] == true) {
                    this.jwtTokenValid = true;
                    this.newStreamSourceAdding = false;

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
                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.getAppLiveStreamsNumber();

                    this.liveBroadcast.streamUrl = "";
                    this.streamUrlValid=true;
                }
                else {
                    var errorCode = data["message"];

                    this.jwtTokenValid = false;
                    this.newIPCameraAdding = false;
                    this.newStreamSourceAdding = false;

                    $.notify({
                        icon: "ti-save",
                        message: "Failed. Error is " + data["message"]
                    }, {
                        type: "danger",
                        delay: 2000,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.getAppLiveStreamsNumber();

                    if (errorCode == -3) {

                        swal({
                            title: "High CPU Load",
                            text: "Please Decrease CPU Load Then Try Again",
                            type: 'error',

                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'OK'
                        }).then(() => {
                        }).catch(function () {
                        });
                    }
                }
                //swal.close();
                this.newStreamSourceAdding = false;
                this.newStreamSourceActive = false;
                this.liveBroadcast.name = "";
                this.liveBroadcast.ipAddr = "";
                this.liveBroadcast.username = "";
                this.liveBroadcast.password = "";
               
            });
    }
    addPlaylistItem(): void {
       
        this.liveBroadcast.playListItemList.push({
            streamUrl: "",
            type: "VoD",
        });

    }

    deletePlaylistItem(index: number): void {
        this.liveBroadcast.playListItemList.splice(index, 1);
    }

    addPlaylist(isValid: boolean): void {

        this.playlistNameEmpty = false;

        if (!isValid) {
            //not valid form return directly
            return;
        }

        if (!this.restService.checkStreamName(this.liveBroadcast.name)) {
            this.playlistNameEmpty = true;
            return;
        }
        this.liveBroadcast.type = "playlist";

        this.playlistNameEmpty = false;
        this.newPlaylistAdding = true;

        this.restService.createLiveStream(this.appName, this.liveBroadcast, null, "")
            .subscribe(data => {
                console.log("data :" + JSON.stringify(data));
                if (data["streamId"] != null) {

                    this.newPlaylistAdding = false;

                  //  this.playlist = new Playlist ();

                  //  this.playlistItems = [];
                  //  this.playlist.broadcastItemList = [];

                    $.notify({
                        icon: "ti-save",
                        message: Locale.getLocaleInterface().new_playlist_created
                    }, {
                        type: "success",
                        delay: 1000,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.getAppLiveStreamsNumber();

                }
                else {
                    var errorCode = data["message"];

                    $.notify({
                        icon: "ti-save",
                        message: Locale.getLocaleInterface().new_playlist_error
                    }, {
                        type: "danger",
                        delay: 2000,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.getAppLiveStreamsNumber();

                    if (errorCode == -3) {

                        swal({
                            title: "High CPU Load",
                            text: "Please Decrease CPU Load Then Try Again",
                            type: 'error',

                            confirmButtonColor: '#3085d6',
                            confirmButtonText: 'OK'
                        }).then(() => {


                        }).catch(function () {

                        });
                    }

                }

                //swal.close();
                this.newPlaylistAdding = false;
                this.newPlaylistActive = false;

            });

    }

    setJwtRestFilterString(length: number) {
        // Declare all characters
        let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
        // Pick characers randomly
        let str = '';
        for (let i = 0; i < length; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        this.appSettings.jwtSecretKey = str;
        return str;
    };


    setJwtStreamFilterString(length: number) {
        // Declare all characters
        let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        // Pick characers randomly
        let str = '';
        for (let i = 0; i < length; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        this.appSettings.jwtStreamSecretKey = str;
        return str;
    };

    startDiscover() {
        this.discoveryStarted = true;
        this.onvifURLs = this.getDiscoveryList();
        this.noCamWarning = false;

        setTimeout(() => {

            if (this.onvifURLs) {
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

            if (this.onvifURLs) {

                //if all cameras are added, onvif array may still be alive, then length control should be done
                if (this.onvifURLs.length > 0) {

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


                    }).then((result) => 
                    {
                        if (result) {
                            this.liveBroadcast.ipAddr = this.onvifURLs[result].toString();
                        }
                    })

                } 
                else 
                {
                    this.discoveryStarted = false;
                    this.noCamWarning = true;
                    this.camera.ipAddr = "";
                }
            } 
            else {
                this.discoveryStarted = false;
                this.noCamWarning = true;
                this.camera.ipAddr = "";
            }
        }, 6000);


    }

    getDiscoveryList(): String[] {

        this.onvifURLs = null;

        this.restService.autoDiscover(this.appName).subscribe(
            streams => {


                if (streams.length != 0) {
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


    toConsole(val: string): void {

        console.log(val)

    }

    createLiveStream(isValid: boolean): void {

        this.streamNameEmpty = false;

        if (!isValid) {
            //not valid form return directly
            return;
        }

        this.liveBroadcast.type = "liveStream";

        if (!this.restService.checkStreamName(this.liveBroadcast.name)){

            this.streamNameEmpty = true;
            return;
        }

        var socialNetworks = [];
        this.shareEndpoint.forEach((value, index) => {
            if (value === true) {
                socialNetworks.push(this.videoServiceEndpoints[index].id);
            }
        });


        this.newLiveStreamCreating = true;
        this.restService.createLiveStream(this.appName, this.liveBroadcast, null, socialNetworks.join(","))
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
                    this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                    this.liveBroadcast.name = "";
                }

                this.newLiveStreamCreating = false;
                this.getAppLiveStreamsNumber();

            });

    }

    switchToListView(): void {

        this.getAppLiveStreams(0, 5);

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

    switchToGridView(): void {

        setTimeout(() => {
            this.openGridPlayers(0, 4);
        }, 500);
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

    cancelPlaylist(): void {
        this.newPlaylistActive = false;
    }

    copyPublishUrl(streamUrl: string): void {
        this.clipBoardService.copyFromContent(this.getRtmpUrl(streamUrl));
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

    setRecordingStatus(streamId: string, recordingStatus: boolean, recordingType: string): void {

        //Check H.264 is disabled
        if(!this.appSettings.h264Enabled && recordingType == "mp4" && recordingStatus){
            $.notify({
                icon: "ti-save",
                message: "Firstly, please enable H.264 Encoder in App Settings"
            }, {
                type: "warning",
                delay: 3000,
                placement: {
                    from: 'top',
                    align: 'right'
                }
            });
            return;
        }
        //Check WebM settings is disabled
        if(!this.appSettings.vp8Enabled && recordingType == "webm" && recordingStatus){
            $.notify({
                icon: "ti-save",
                message: "Firstly, please enable VP8 Encoder in App Settings"
            }, {
                type: "warning",
                delay: 3000,
                placement: {
                    from: 'top',
                    align: 'right'
                }
            });
            return;
        }

        this.restService.setStreamRecordingStatus(this.appName, streamId, recordingStatus, recordingType).subscribe(data => {
             if (data["success"] == true) {

                 if(recordingStatus){
                     var recordingMessage = "open";
                 }
                 else{
                     var recordingMessage = "close";
                 }

                 this.getAppLiveStreams(this.streamListOffset, this.pageSize);

                 $.notify({
                     icon: "ti-save",
                     message: recordingType + " Recording will be " + recordingMessage + ". Please wait few seconds."
                    }, {
                        type: "success",
                        delay: 1000,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
                }
                else{
                    $.notify({
                        icon: "ti-save",
                        message: recordingType + " Recording service failed"
                    }, {
                        type: "warning",
                        delay: 3000,
                        placement: {
                            from: 'top',
                            align: 'right'
                        }
                    });
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

        this.clipBoardService.copyFromContent(embedCode);
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

    copyVoDEmbedCode(name: string, type: string, vodId: string): void {

        var Index = this.appSettings.vodFolder.lastIndexOf("/");
        var folderName = this.appSettings.vodFolder.substring(Index);

        var lastSlashIndex = name.lastIndexOf(".mp4");
        var  VoDName = name.substring(0, lastSlashIndex);

        if(type == "uploadedVod"){
            VoDName = vodId ;
        }
        else if(type == "userVod"){
            VoDName = folderName + "/" + VoDName ;
        }


        let embedCode = '<iframe width="560" height="315" src="'
            + HTTP_SERVER_ROOT + this.appName + "/play.html?name=" + VoDName +"&playOrder=vod"
            + '" frameborder="0" allowfullscreen></iframe>';

        this.clipBoardService.copyFromContent(embedCode);
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
        return this.restService.getRtmpUrl(this.appName, streamUrl);
    }


    convertJavaTime(unixtimestamp: number) {


        // Months array
        var months_arr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
        var convdataTime = month + '-' + day + '-' + year + ' ' + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

        return convdataTime;

    }

    moveDown(camera: LiveBroadcast) {
        this.restService.moveDown(camera, this.appName).subscribe(
            result => {
                console.log('result!!!: ' + result);
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );
    }

    moveUp(camera: LiveBroadcast) {
        this.restService.moveUp(camera, this.appName).subscribe(
            result => {
                console.log('result!!!: ' + result);
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );
    }

    moveRight(camera: LiveBroadcast) {
        this.restService.moveRight(camera, this.appName).subscribe(
            result => {
                console.log('result!!!: ' + result);
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );
    }


    moveLeft(camera: LiveBroadcast) {
        this.restService.moveLeft(camera, this.appName).subscribe(
            result => {
                console.log('result!!!: ' + result);
            },
            error => {
                console.log('!!!Error!!! ' + error);
            },
        );
    }

    webrtcStats(broadcast : LiveBroadcast) {
        this.dialog.open(WebRTCClientStatsComponent, {
            width: '90%',
            data: {
                appName: this.appName,
                streamName: broadcast.name,
                streamId: broadcast.streamId,
            },
            disableClose: true,
        });
    }


    openRTMPEndpointDialog(stream: BroadcastInfo): void {

        if (this.liveStreamEditing == null || stream.streamId != this.liveStreamEditing.streamId || stream.name != this.liveStreamEditing.name) {
            this.liveStreamEditing = new LiveBroadcast();
            this.liveStreamEditing.streamId = stream.streamId;
            this.liveStreamEditing.name = stream.name;
            this.liveStreamEditing.description = "";
        }


        if (this.liveStreamEditing) {
            let dialogRef = this.dialog.open(RtmpEndpointEditDialogComponent, {

                height: '300px',
                maxHeight: '500px',
                width: '600px',
                maxWidth: '600px',

                data: {
                    name: this.liveStreamEditing.name,
                    streamId: this.liveStreamEditing.streamId,
                    appName: this.appName,
                    endpointList: stream.endPointList,
                }

            });


            dialogRef.afterClosed().subscribe(result => {
                this.getAppLiveStreams(this.streamListOffset, this.pageSize);
                this.getAppLiveStreamsNumber();
            });

        }
    }

    stopStreams(streamId: string): void {

        this.restService.stopStream(this.appName, streamId).subscribe(data => {

            if (data["success"] == true) {

                $.notify({
                    icon: "ti-save",
                    message: "Stream's stopping, please wait a few seconds."
                }, {
                    type: "success",
                    delay: 3000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
            else{

                $.notify({
                    icon: "ti-save",
                    message: "Stream stop is failed.<br/>Error: " + data["message"]
                }, {
                    type: "warning",
                    delay: 3000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
            this.callTimer();
        });

    }

    startStreams(streamId: string): void {

        this.restService.startStream(this.appName, streamId).subscribe(data => {

            if (data["success"] == true) {

                $.notify({
                    icon: "ti-save",
                    message: "Stream's starting, please wait a few seconds."
                }, {
                    type: "success",
                    delay: 3000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
            else{

                $.notify({
                    icon: "ti-save",
                    message: "Stream Start Failed.<br/>Error: " + data["message"]
                }, {
                    type: "warning",
                    delay: 5000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });

            }
            this.callTimer();
        });
    }


    stopPlaylist(streamId: string): void {

        this.restService.stopStream(this.appName, streamId).subscribe(data => {

            if (data["success"] == true) {

                $.notify({
                    icon: "ti-save",
                    message: "Playlist's stopping, please wait a few seconds."
                }, {
                    type: "success",
                    delay: 3000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
            else{

                $.notify({
                    icon: "ti-save",
                    message: "Playlist Stop Failed.<br/>Error: " + data["message"]
                }, {
                    type: "warning",
                    delay: 3000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
            this.callTimer();
        });

    }

    startPlaylist(streamId: string): void {

        this.restService.startStream(this.appName, streamId).subscribe(data => {

            if (data["success"] == true) {

                $.notify({
                    icon: "ti-save",
                    message: "Playlist's starting, please wait a few seconds."
                }, {
                    type: "success",
                    delay: 3000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });
            }
            else{

                $.notify({
                    icon: "ti-save",
                    message: "Playlist Start Failed"
                }, {
                    type: "warning",
                    delay: 3000,
                    placement: {
                        from: 'top',
                        align: 'right'
                    }
                });

            }
            this.callTimer();
        });
    }




}


