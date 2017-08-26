import { ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuard } from './auth.guard';
import { HomeComponent } from './home/home.component';
import { LearnMoreComponent } from './learn-more/learn-more.component';
import { DocumentationComponent } from './documentation/documentation.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { SignUpComponent } from './sign-up/sign-up.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TestsComponent } from './tests/tests.component';
import { SingleTestComponent } from './single-test/single-test.component';
import { EditStepsComponent } from './edit-steps/edit-steps.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';
import { SuiteSettingsComponent } from './suite-settings/suite-settings.component';
import { TestSettingsComponent } from './test-settings/test-settings.component';
import { TestsHistoryComponent } from './tests-history/tests-history.component';
import { SingleTestHistoryComponent } from './single-test-history/single-test-history.component';
import { TestHistoryComponent } from './test-history/test-history.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

const appRoutes: Routes = [
    {
        path: '',
        component: HomeComponent
    },

    {
        path: 'learn-more',
        component: LearnMoreComponent
    },

    {
        path: 'documentation',
        component: DocumentationComponent
    },

    {
        path: 'sign-in',
        component: SignInComponent
    },

    {
        path: 'sign-up',
        component: SignUpComponent
    },

    {
        path: 'forgot-password',
        component: ForgotPasswordComponent
    },

    {
        path: 'reset-password/:id',
        component: ResetPasswordComponent
    },

    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/suites/:suite',
        component: TestsComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/suites/:suite/tests/:test',
        component: SingleTestComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/suites/:suite/tests/:test/edit',
        component: EditStepsComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/account-settings',
        component: AccountSettingsComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/suites/:suite/suite-settings',
        component: SuiteSettingsComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/suites/:suite/tests/:test/test-settings',
        component: TestSettingsComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/suites/:suite/history/:id',
        component: TestsHistoryComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/suites/:suite/history/:id/:test',
        component: SingleTestHistoryComponent,
        canActivate: [AuthGuard]
    },

    {
        path: 'dashboard/suites/:suite/tests/:test/history/:id',
        component: TestHistoryComponent,
        canActivate: [AuthGuard]
    }
];

export const routing: ModuleWithProviders = RouterModule.forRoot(appRoutes);
