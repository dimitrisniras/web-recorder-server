import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../services/posts.service';
import { AuthService } from '../services/auth.service';
import { AlertService } from '../services/alert.service';
import { User } from '../user';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.css']
})
export class AccountSettingsComponent implements OnInit {
  currentUser: User;
  firstName: string;
  lastName: string;
  currentPassword: string;
  newPassword: string;
  newPasswordRepeat: string;
  passwordStatus: string;
  detailsStatus: string;
  passwordMessage: string;
  detailsMessage: string;

  // tslint:disable-next-line:max-line-length
  constructor(private postsService: PostsService, private router: Router, route: ActivatedRoute, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
  }

  ngOnInit() {
    this.firstName = this.currentUser.firstName;
    this.lastName = this.currentUser.lastName;
  }

  onSaveChanges() {
    // tslint:disable-next-line:max-line-length
    if (this.currentUser.email === '' || this.currentUser.firstName === '' || this.currentUser.lastName === '') {
      this.detailsStatus = 'fail';
      this.detailsMessage = 'Please fill out all fields';
    } else {
      // tslint:disable-next-line:max-line-length
      this.postsService.updateUser(this.currentUser._id, { 'email': this.currentUser.email, 'firstName': this.currentUser.firstName, 'lastName': this.currentUser.lastName }).subscribe(data => {
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.detailsStatus = 'success';
        this.detailsMessage = 'Personal details successfully changed.';
      }, error => {
        this.detailsStatus = 'fail';
        this.detailsMessage = error._body;
      });
    }
  }

  onChangePassword() {
    if (this.newPassword === this.newPasswordRepeat) {
      // tslint:disable-next-line:max-line-length
      this.postsService.updateUserPassword(this.currentUser._id, { 'newPassword': this.newPassword, 'oldPassword': this.currentPassword }).subscribe(data => {
        this.passwordStatus = 'success';
        this.passwordMessage = 'Password successfully changed.';
      }, error => {
        this.passwordStatus = 'fail';
        this.passwordMessage = error._body;
      });
    } else {
      this.passwordMessage = 'Passwords do not match.';
      this.passwordStatus = 'fail';
    }
  }

  deleteAccount() {
    this.postsService.deleteUser(this.currentUser._id).subscribe(() => {
      this.authenticationService.logout();
    });
  }

  logout() {
    this.authenticationService.logout();
  }

}
