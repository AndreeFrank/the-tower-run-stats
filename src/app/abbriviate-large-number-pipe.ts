import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'abbreviateLargeNumber',
})
export class AbbreviateLargeNumberPipe implements PipeTransform {
  transform(value: number): string {
    let suffixes = ['K', 'M', 'B', 'T'];

    if (value < 1000) {
      return value.toFixed(2).toString();
    }

    let exp = Math.floor(Math.log(value) / Math.log(1000));
    return (value / Math.pow(1000, exp)).toFixed(2) + suffixes[exp - 1];
  }
}
