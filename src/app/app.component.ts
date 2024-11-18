import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { concatMap, from } from 'rxjs';
import { createWorker } from 'tesseract.js';
import { AbbreviateLargeNumberPipe } from './abbriviate-large-number-pipe';
import { LocalStorageService } from './local-storage-service';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

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
  dateOfRun: number;
  tier: string;
  time: number;
  wave: number;
  cash: string;
  cashPerHour: string;
  cashPerWave: string;
  coins: string;
  cph: string;
  cpw: string;
  cells: string;
  cellsPerHour: string;
  cellsPerWave: string;
  shards: string;
  shardsPerHour: string;
  shardsPerWave: string;
  notes: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TableModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  uniqueId: number = 0;
  DATA_STORE_KEY = 'the-tower-run-data-v0';

  statData: StatData[] = [];

  constructor(private _localStorageService: LocalStorageService) {}

  ngOnInit() {
    let statDataStr = this._localStorageService.getData(this.DATA_STORE_KEY);
    this.statData = Boolean(statDataStr)
      ? JSON.parse(statDataStr as string)
      : [];

    console.log('INIT: ', this.statData);
  }

  onFileSelected(event: any) {
    const file: File = event?.target?.files![0] || undefined;
    // let date = new Date(0);
    // date.setUTCSeconds(file.lastModified);
    // console.log('DATE: ', date);

    let statDataStr = this._localStorageService.getData(this.DATA_STORE_KEY);
    let statData: StatData[] = Boolean(statDataStr)
      ? JSON.parse(statDataStr as string)
      : [];
    from(createWorker('eng'))
      .pipe(concatMap((worker) => worker.recognize(file)))
      .subscribe((res) => {
        console.log('TEXT: ', res.data.text);

        let statObj = this._createStatObject(res.data.text, file.lastModified);
        console.log(statObj);

        if (
          !statData.map((data) => data.dateOfRun).includes(statObj.dateOfRun)
        ) {
          console.log('SAVING');
          this.statData.push(statObj);

          this._localStorageService.saveData(
            this.DATA_STORE_KEY,
            JSON.stringify(this.statData)
          );
        } else {
          console.log('ALREADY SAVED');
        }
      });
  }

  getDate(epoch: number) {
    const dt = new Date(epoch);
    return `${dt.getUTCFullYear()}-${dt.getUTCMonth()}-${dt.getUTCDay()}`;
  }

  private _createStatObject(text: string, dateOfRun: number): StatData {
    const alnp = new AbbreviateLargeNumberPipe();

    let time = this._convertToNumber(this._findData('Real Time', text));
    let wave = this._convertToNumber(this._findData('Wave', text));
    let cash = this._convertToNumber(this._findData('Cash Earned', text));
    let coins = this._convertToNumber(this._findData('Coins Earned', text));
    let cells = this._convertToNumber(this._findData('Cells Earned', text));
    let shards = this._convertToNumber(
      this._findData('Reroll Shards Earned', text)
    );

    return {
      dateOfRun,
      tier: this._findData('Tier', text),
      time,
      wave,
      cash: Number.isNaN(cash) ? 'NaN' : alnp.transform(cash),
      cashPerHour: Number.isNaN(cash) ? 'NaN' : alnp.transform(cash / time),
      cashPerWave: Number.isNaN(cash) ? 'NaN' : alnp.transform(cash / wave),
      coins: Number.isNaN(coins) ? 'NaN' : alnp.transform(coins),
      cph: Number.isNaN(coins) ? 'NaN' : alnp.transform(coins / time),
      cpw: Number.isNaN(coins) ? 'NaN' : alnp.transform(coins / wave),
      cells: Number.isNaN(cells) ? 'NaN' : alnp.transform(cells),
      cellsPerHour: Number.isNaN(cells) ? 'NaN' : alnp.transform(cells / time),
      cellsPerWave: Number.isNaN(cells) ? 'NaN' : alnp.transform(cells / wave),
      shards: Number.isNaN(shards) ? 'NaN' : alnp.transform(shards),
      shardsPerHour: Number.isNaN(shards)
        ? 'NaN'
        : alnp.transform(shards / time),
      shardsPerWave: Number.isNaN(shards)
        ? 'NaN'
        : alnp.transform(shards / wave),
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
        let split = textRow.split(' ');
        let value = '';
        if (split.length === 3) {
          value = split[2];
        } else {
          // Sometimes there is an extra ' ' between number and suffix
          value = split[2] + split[3];
        }
        let dotSplit = value.split(',');
        // Sometimes a B can be read as an 8
        if (
          dotSplit.length === 2 &&
          dotSplit[1].length === 3 &&
          dotSplit[1].charAt(2) === '8'
        ) {
          value = `${dotSplit[0]}.${dotSplit[1].substring(
            0,
            dotSplit[1].length - 1
          )}B`;
        }
        return value;
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

  private _convertToNumber(numberStr: string): number {
    numberStr = numberStr.replace('$', '');
    numberStr = numberStr.replace(',', '.');

    let base = parseFloat(numberStr);
    if (numberStr.match(/K/)) {
      return Number(Math.round(base * 1000));
    } else if (numberStr.match(/M/)) {
      return Number(Math.round(base * 1000000));
    } else if (numberStr.match(/B/)) {
      return Number(Math.round(base * 1000000000));
    } else if (numberStr.match(/T/)) {
      return Number(Math.round(base * 1000000000000));
    } else if (numberStr.match(/q/)) {
      return Number(Math.round(base * 1000000000000000));
    } else if (numberStr.match(/Q/)) {
      return Number(Math.round(base * 1000000000000000000));
    }

    return Number(base);
  }
}
