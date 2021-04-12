import {Component, ElementRef, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '../../rest/auth.service';
import {User} from '../../rest/rest.service';
import {SupportRestService} from "../../rest/support.service";

declare var $:any;

@Component({
    moduleId:module.id,
    selector: 'login-cmp',
    templateUrl: './login.component.html'
})

export class LoginComponent implements OnInit{
    test : Date = new Date();
    private toggleButton;
    private sidebarVisible: boolean;
    private nativeElement: Node;
    public email = "";
    public password = "";
    public showIncorrectCredentials = false;
    public firstLogin = false;
    public firstUser: User;
    public temp_model_password:string;
    public firstUserIsCreating:boolean;
    public showYouCanLogin:boolean;
    public showFailedToCreateUserAccount:boolean;
    public communityEditionCheckbox:boolean;

    constructor(private element : ElementRef, private supportRestService:SupportRestService, private auth: AuthService, private router: Router) {
        this.nativeElement = element.nativeElement;
        this.sidebarVisible = false;
        this.showYouCanLogin = false;
        this.showFailedToCreateUserAccount = false;

    }
    checkFullPageBackgroundImage(){
        var $page = $('.full-page');
        var image_src = $page.data('image');

        if(image_src !== undefined){
            var image_container = '<div class="full-page-background" style="background-image: url(' + image_src + ') "/>'
            $page.append(image_container);
        }
    };

    ngOnInit(){
        this.auth.isFirstLogin().subscribe(data => {
            this.firstLogin = data["success"];
            if (this.firstLogin) {
                this.firstUser = new User("", "");
            }
        });

        this.auth.licenceWarningDisplay = true;
        
        this.checkFullPageBackgroundImage();

        this.logout();

        var navbar : HTMLElement = this.element.nativeElement;
        this.toggleButton = navbar.getElementsByClassName('navbar-toggle')[0];

        setTimeout(function(){
            // after 1000 ms we add the class animated to the login/register card
            $('.card').removeClass('card-hidden');

        }, 700)
    }

    logout() {
        // localStorage.setItem("authenticated", null);
        localStorage.clear();
        //this.router.navigateByUrl("/pages/login");
    }

    sidebarToggle(){
        var toggleButton = this.toggleButton;
        var body = document.getElementsByTagName('body')[0];
        var sidebar = document.getElementsByClassName('navbar-collapse')[0];
        if(this.sidebarVisible == false){
            setTimeout(function(){
                toggleButton.classList.add('toggled');
            },500);
            body.classList.add('nav-open');
            this.sidebarVisible = true;
        } else {
            this.toggleButton.classList.remove('toggled');
            this.sidebarVisible = false;
            body.classList.remove('nav-open');
        }
    }

    loginUser() {

        this.auth.login(this.email, this.password).subscribe(data =>{

            if (data["success"] == true) {
                this.auth.isAuthenticated = data["success"];
                localStorage.setItem("authenticated", "true");
                this.router.navigateByUrl("/dashboard");
            }
            else {
                this.showIncorrectCredentials = true;
            }

        });

    }


    createFirstAccount(isValid:boolean) {
        console.log("is first account");
        if (!isValid) {
            return;
        }

        this.firstUserIsCreating = true;
        this.auth.createFirstAccount(this.firstUser).subscribe(data => {
            this.firstUserIsCreating = false;
            if (data["success"] == true) {
                this.firstLogin = false;
                this.showYouCanLogin = true;

                this.auth.isCommunityCheckboxEnabled = this.communityEditionCheckbox;
            }
            else {
                this.showFailedToCreateUserAccount = true;
            }
        });
    }

    credentialsChanged():void {
        this.showIncorrectCredentials = false;
    }

}
