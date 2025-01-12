import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MessageBox} from './message-box';

/**
 * Component for displaying a plain text message.
 */
@Component({
  selector: 'wb-text-message',
  template: `{{text ?? ''}}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextMessageComponent {

  public text: string | undefined;

  constructor(messageBox: MessageBox<string>) {
    this.text = messageBox.input;
  }
}
