import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertService } from '../services/alert.service';
import { PostsService } from '../services/posts.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit {
  resetEmail = '';

  // tslint:disable-next-line:max-line-length
  constructor(private route: ActivatedRoute, private router: Router, private alertService: AlertService, private postsService: PostsService) { }

  ngOnInit() { }

  submit() {
    this.postsService.forgotPassword(this.resetEmail).subscribe(data => {
      this.alertService.success('Email sent to ' + this.resetEmail, true);
    },
    error => {
      this.alertService.error(error._body);
    });
  }

}
