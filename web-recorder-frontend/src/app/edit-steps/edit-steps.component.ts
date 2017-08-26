import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PostsService } from '../services/posts.service';
import { AuthService } from '../services/auth.service';
import { User } from '../user';
import { TestObject } from '../test-object';

@Component({
  selector: 'app-edit-steps',
  templateUrl: './edit-steps.component.html',
  styleUrls: ['./edit-steps.component.css']
})
export class EditStepsComponent implements OnInit {
  currentUser: User;
  testName: string;
  suiteName: string;
  test: any;
  testObject: any[];
  preconditions: any[];
  postconditions: any[];
  applyToAllStatus: string;
  applyToAllMessage: string;
  applyToAllIndex: number;
  suites: any[];
  filter: TestObject = new TestObject();
  search = 'id';

  // tslint:disable-next-line:max-line-length
  constructor(private postsService: PostsService, private router: Router, route: ActivatedRoute, private authenticationService: AuthService) {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
    this.testName = route.snapshot.params['test'];
    this.suiteName = route.snapshot.params['suite'];
  }

  ngOnInit() {
     this.postsService.getTest(this.currentUser._id, this.suiteName, this.testName).subscribe(test => {
       this.test = test;
       this.preconditions = test.preconditions;
       this.postconditions = test.postconditions;

       try {
         this.testObject = JSON.parse(test.testObject);
       } catch (err) {
         this.testObject = test.testObject;
       }
    });

    this.postsService.getSuiteNames(this.currentUser._id).subscribe(suites => {
      this.suites = suites.sort(function (a, b) {
            return a.localeCompare(b);
      });
    });
  }

  onSave() {
    // tslint:disable-next-line:max-line-length
    this.postsService.updateTest(this.currentUser._id, this.suiteName, this.testName, {'testObject': this.testObject, 'preconditions': this.preconditions, 'postconditions': this.postconditions}).subscribe(() => {
      this.router.navigate(['/dashboard/suites/' + this.suiteName + '/tests/' + this.testName]);
    });
  }

  onCancel() {
    this.router.navigate(['/dashboard/suites/' + this.suiteName + '/tests/' + this.testName]);
  }

  addAbove(index: number) {
    // tslint:disable-next-line:max-line-length
    this.testObject.splice(index, 0, {'type': 'click', 'identifier': 'id', 'id': '', 'input': '', 'url': '', 'status': 'PENDING', 'error': '', 'description': ''});
  }

  addBelow(index: number) {
    // tslint:disable-next-line:max-line-length
    this.testObject.splice(index + 1, 0, {'type': 'click', 'identifier': 'id', 'id': '', 'input': '', 'url': '', 'status': 'PENDING', 'error': '', 'description': ''});
  }

  addStep() {
    // tslint:disable-next-line:max-line-length
    this.testObject.push({'type': 'click', 'identifier': 'id', 'id': '', 'input': '', 'url': '', 'status': 'PENDING', 'error': '', 'description': ''});
  }

  deleteStep(index: number) {
    this.testObject.splice(index, 1);
  }

  addPrecondition() {
    this.preconditions.push({'testName': '', 'suiteName': '', 'status': 'PENDING', 'len': 0});
  }

  addPreconditionBelow(index: number) {
    this.preconditions.splice(index + 1, 0, {'testName': '', 'suiteName': '', 'status': 'PENDING', 'len': 0});
  }

  addPreconditionAbove(index: number) {
    this.preconditions.splice(index, 0, {'testName': '', 'suiteName': '', 'status': 'PENDING', 'len': 0});
  }

  deletePrecondition(index: number) {
    this.preconditions.splice(index, 1);
  }

  addPostcondition() {
    this.postconditions.push({'testName': '', 'suiteName': '', 'status': 'PENDING', 'len': 0});
  }

  addPostconditionBelow(index: number) {
    this.postconditions.splice(index + 1, 0, {'testName': '', 'suiteName': '', 'status': 'PENDING', 'len': 0});
  }

  addPostconditionAbove(index: number) {
    this.postconditions.splice(index, 0, {'testName': '', 'suiteName': '', 'status': 'PENDING', 'len': 0});
  }

  deletePostcondition(index: number) {
    this.postconditions.splice(index, 1);
  }

  applyToAll(index: number) {
    this.postsService.updateStepsID(this.currentUser._id, this.suiteName, this.testName, index, this.testObject[index].id).subscribe(() => {
      this.applyToAllStatus = 'success';
      this.applyToAllMessage = 'Changes successfully applied to all tests';
      this.applyToAllIndex = index;
    }, error => {
      this.applyToAllStatus = 'fail';
      this.applyToAllMessage = 'Failed to apply changes to all tests';
      this.applyToAllIndex = index;
    });
  }

  findTestPreconditionNames(suiteName: string, index: number) {
    this.postsService.getTestNames(this.currentUser._id, suiteName).subscribe(tests => {
      this.preconditions[index].tests = tests.sort(function (a, b) {
            return a.localeCompare(b);
      });
    });
  }

  findTestPostconditionNames(suiteName: string, index: number) {
    this.postsService.getTestNames(this.currentUser._id, suiteName).subscribe(tests => {
      this.postconditions[index].tests = tests.sort(function (a, b) {
            return a.localeCompare(b);
      });
    });
  }

  logout() {
    this.authenticationService.logout();
  }

}
