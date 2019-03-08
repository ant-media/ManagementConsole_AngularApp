import {AfterViewInit, Component, Injectable, OnInit} from '@angular/core';
import {ServerSettings} from "../app.page/app.page.component";
import {Locale} from "../locale/locale";
import {AuthService} from "../rest/auth.service";
import {RestService} from "../rest/rest.service";
import {ActivatedRoute, Router} from "@angular/router";
import {HttpClient} from "@angular/common/http";
import {DataService} from "../rest/data.service";

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';


declare var $:any;
declare var swal: any;

export class Licence {
    licenceId: string;
    startDate: number;
    endDate: number;
    type: string;
    licenceCount: string;
    owner: string;}

@Component({
    moduleId: module.id,
    selector: 'server.settings',
    templateUrl: './server.settings.component.html'
})




@Injectable()
export class ServerSettingsComponent implements OnInit, AfterViewInit{

    get messageReceived(): string {
        return this._messageReceived;
    }

    set messageReceived(value: string) {
        this._messageReceived = value;
    }

    public serverSettings: ServerSettings;
    public settingsReceived = false;
    public licenseStatus = "Getting license status";
    public licenseStatusReceiving = false;
    public currentLicence : Licence;
    private _messageReceived : string;
    public timerId: any;
    public displayWarning = true;



    constructor(private http: HttpClient, private route: ActivatedRoute,
                private restService: RestService,
                public router: Router,private dataService: DataService, private authService: AuthService,) {



    }


    ngOnInit(){

        this.serverSettings = new ServerSettings(null,"key", false);
        this.getServerSettings();


    }

    ngAfterViewInit() {

    }

    ngOnDestroy() {


    }



    public getLicenseStatus(){

        this.licenseStatusReceiving = true;
        this.restService.getLicenseStatus(this.serverSettings.licenceKey ).subscribe(data => {
            this.licenseStatusReceiving = false;
            if (data != null) {
                this.licenseStatus = "valid";
                this.currentLicence= <Licence>data;
                console.log(data);

            }
            else {

                this.licenseStatus = "invalid";
                console.log("invalid license");


                if (this.authService.licenceWarningDisplay && !this.serverSettings.buildForMarket) {

                    swal({
                        title: "Invalid License",
                        text: "Please Validate Your License ",
                        type: 'error',

                        confirmButtonColor: '#3085d6',
                        confirmButtonText: 'OK',

                        onClose: function () {

                        }
                    }).then(() => {

                    }).catch(function () {

                    });
                }

            }

            this.authService.licenceWarningDisplay = false;
        });

        return this.currentLicence;

    }

    changeServerSettings(isValid : boolean): void {

        if (!isValid) {
            return;
        }
        // this.licenseStatusReceiving = true;
        this.restService.changeServerSettings( this.serverSettings).subscribe(data => {
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

                this.authService.serverSettings = this.serverSettings;
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
            this.authService.licenceWarningDisplay = true;
            if(!this.serverSettings.buildForMarket){
                this.getLicenseStatus()
            }

        });


    }

    getServerSettings(): void {
        this.restService.getServerSettings().subscribe(data => {
            this.serverSettings = <ServerSettings>data;
            console.log(data);

            if(!this.serverSettings.buildForMarket){
                this.getLicenseStatus()
            }

        });
        this.settingsReceived = true;


    }


}