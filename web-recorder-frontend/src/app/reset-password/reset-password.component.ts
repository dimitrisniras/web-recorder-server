import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PostsService } from '../services/posts.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  newPassword = '';
  newPasswordRepeat = '';
  tempPass: string;
  passwordStatus: string;
  passwordMessage: string;

  constructor(private route: ActivatedRoute, private router: Router, private postsService: PostsService) {
    this.tempPass = route.snapshot.params['id'];
  }

  ngOnInit() { }

  submit() {
    if (this.newPassword === this.newPasswordRepeat) {
      this.postsService.resetPassword(this.tempPass, this.newPassword).subscribe(data => {
        this.router.navigate(['/sign-in']);
      },
      error => {
        this.passwordStatus = 'fail';
        this.passwordMessage = error._body;
      });
    } else {
      this.passwordMessage = 'Passwords do not match.';
      this.passwordStatus = 'fail';
    }
  }

}
