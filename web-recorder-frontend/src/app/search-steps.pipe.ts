import { Pipe, PipeTransform } from '@angular/core';
import { TestObject } from './test-object';

@Pipe({
  name: 'searchSteps',
  pure: false
})
export class SearchStepsPipe implements PipeTransform {

  transform(testObject: any[], filter: TestObject): any[] {
    if (!testObject || !filter) {
      return testObject;
    }

    return testObject.filter((t: any) => this.applyFilter(t, filter));
  }

  applyFilter(object: any, filter: TestObject) {
    for (let field in filter) {
      if (filter[field]) {
        if (object[field].toLowerCase().indexOf(filter[field].toLowerCase()) === -1) {
          return false;
        };
      }
    }

    return true;
  }

}
