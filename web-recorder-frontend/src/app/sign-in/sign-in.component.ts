import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertService } from '../services/alert.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnInit {
  model: any = {};
  returnUrl: string;

  // tslint:disable-next-line:max-line-length
  constructor(private route: ActivatedRoute, private router: Router, private authenticationService: AuthService, private alertService: AlertService) { }

  ngOnInit() {
    if (localStorage.getItem('currentUser')) {
        this.router.navigate(['/dashboard']);
        return true;
    }

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  login() {
    this.authenticationService.login(this.model.email, this.model.password).subscribe(data => {
        this.router.navigate([this.returnUrl]);
    },
    error => {
        this.alertService.error(error._body);
    });
  }

}
