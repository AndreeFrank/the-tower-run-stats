import { AfterViewInit, Component } from '@angular/core';
import { createWorker } from 'tesseract.js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  template: `<h1>Default</h1>`,
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements AfterViewInit {
  title = 'default';

  ngAfterViewInit(): void {

    (async () => {
      const worker = await createWorker('eng');
      const ret = await worker.recognize('../assets/test.png');
      console.log(ret.data.text);
      await worker.terminate();
    })();
  }
}
