import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SuiteSettingsComponent } from './suite-settings.component';

describe('SuiteSettingsComponent', () => {
  let component: SuiteSettingsComponent;
  let fixture: ComponentFixture<SuiteSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SuiteSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SuiteSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
