import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'number', standalone: true })
export class NumberPipe implements PipeTransform {
  transform(value: number): string {
    if (value === undefined || value === null) return '0';
    
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }
}