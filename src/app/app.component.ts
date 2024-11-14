import { Component } from '@angular/core';
import { concatMap, from } from 'rxjs';
import { createWorker } from 'tesseract.js';

type NumSuffixes = 'K' | 'M' | 'B' | 'T' | 'q' | 'Q' | 's' | 'S';

type StatNames =
  | 'Real Time'
  | 'Tier'
  | 'Killed By'
  | 'Coins Earned'
  | 'Cash Earned'
  | 'Cells Earned'
  | 'Reroll Shards Earned'
  | 'Damage Taken'
  | 'Damage Dealt';

interface StatData {
  id: number;
  tier: number;
  time: number;
  wave: number;
  coins: number;
  cph: number;
  cpw: number;
  cells: number;
  cellsPerHour: number;
  cellsPerWave: number;
  shards: number;
  shardsPerHour: number;
  shardsPerWave: number;
  notes: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  uniqueId: number = 0;

  onFileSelected(event: any) {
    const file: File = event?.target?.files![0] || undefined;
    console.log('FILE: ', file);

    from(createWorker('eng'))
      .pipe(concatMap((worker) => worker.recognize(file)))
      .subscribe((res) => {
        console.log('TEXT: ', res.data.text);
        console.log(this._createStatObject(res.data.text));
      });
  }

  private _createStatObject(text: string) {
    return {
      id: ++this.uniqueId,
      tier: this._findData('Tier', text),
      time: this._findData('Real Time', text),
      wave: this._findData('Wave', text),
      cash: this._findData('Cash Earned', text),
      coins: this._findData('Coins Earned', text),
      cells: this._findData('Cells Earned', text),
      shards: this._findData('Reroll Shards Earned', text),
      notes: '',
    };
  }

  private _findData(statToFind: string, text: string) {
    let textRow =
      text.split('\n').find((str) => str.startsWith(statToFind)) || '';

    switch (statToFind) {
      case 'Tier':
      case 'Wave': {
        return textRow.split(' ')[1];
      }
      case 'Killed By':
      case 'Coins Earned':
      case 'Cash Earned':
      case 'Cells Earned':
      case 'Damage Taken':
      case 'Damage Dealt':
        return textRow.split(' ')[2];
      case 'Reroll Shards Earned': {
        return textRow.split(' ')[3];
      }
      case 'Real Time': {
        return this._findRealTime(textRow);
      }
      default:
        return '';
    }
  }

  private _findRealTime(timeStr: string) {
    let splitStr = timeStr.split(' ');
    return this._timeToDecimal(
      splitStr[2].replace('h', '') || '0',
      splitStr[3].replace('m', '') || '0',
      splitStr[4].replace('s', '') || '0'
    );
  }
  private _timeToDecimal(hours: string, minutes: string, seconds: string) {
    return (
      parseInt(hours, 10) +
      parseInt(minutes) / 60 +
      parseInt(seconds) / 3600
    ).toFixed(2);
  }
}
