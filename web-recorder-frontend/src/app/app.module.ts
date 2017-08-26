import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { LearnMoreComponent } from './learn-more/learn-more.component';
import { DocumentationComponent } from './documentation/documentation.component';
import { HomeComponent } from './home/home.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import { AlertComponent } from './alert/alert.component';

import { routing } from './app.routing';
import { AlertService } from './services/alert.service';
import { AuthService } from './services/auth.service';
import { PostsService } from './services/posts.service';
import { AuthGuard } from './auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TestsComponent } from './tests/tests.component';
import { SingleTestComponent } from './single-test/single-test.component';
import { EditStepsComponent } from './edit-steps/edit-steps.component';
import { TestSettingsComponent } from './test-settings/test-settings.component';
import { SuiteSettingsComponent } from './suite-settings/suite-settings.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { TestsHistoryComponent } from './tests-history/tests-history.component';
import { SingleTestHistoryComponent } from './single-test-history/single-test-history.component';
import { TestHistoryComponent } from './test-history/test-history.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { Ng2Bs3ModalModule } from 'ng2-bs3-modal/ng2-bs3-modal';
import { SearchStepsPipe } from './search-steps.pipe';

@NgModule({
  declarations: [
    AppComponent,
    LearnMoreComponent,
    DocumentationComponent,
    HomeComponent,
    SignInComponent,
    SignUpComponent,
    AlertComponent,
    DashboardComponent,
    TestsComponent,
    SingleTestComponent,
    EditStepsComponent,
    TestSettingsComponent,
    SuiteSettingsComponent,
    AccountSettingsComponent,
    TestsHistoryComponent,
    SingleTestHistoryComponent,
    TestHistoryComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    SearchStepsPipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    routing,
    Ng2Bs3ModalModule
  ],
  providers: [
    AuthGuard,
    AlertService,
    AuthService,
    PostsService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
