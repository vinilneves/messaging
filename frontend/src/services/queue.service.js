import moment from "moment";

const _copy = (...messages) => {
  return messages.slice();
};

class QueueService {
  constructor(invisibilitySpan = { seconds: 10 }) {
    this._messages = [];
    this._lastId = 0;
    this.invisibilitySpan = invisibilitySpan;
  }

  _newId() {
    const now = moment().format("YYYYMMDDHHmmssSSS");
    return `${now}_${++this._lastId}`;
  }

  post(message) {
    const id = this._newId();

    const newMessage = {
      id,
      postedAt: moment(),
      visibleAfter: moment(),
      ...message,
    };

    this._messages.push(newMessage);

    return id;
  }

  list() {
    const messages = _copy(...this._messages);
    return messages;
  }

  get() {
    const now = moment();
    const invisibleUntil = moment().add(this.invisibilitySpan);

    const isVisible = (message) => now.isAfter(message.visibleAfter);

    const message = this._messages.find(isVisible);

    if (message) {
      message.visibleAfter = invisibleUntil;
      return _copy(message).pop();
    }

    return null;
  }

  commit(id) {
    const byId = (id) => (message) => message.id === id;

    const messageIndex = this._messages.findIndex(byId(id));

    if (messageIndex > -1) {
      this._messages.splice(messageIndex, 1);
      return true;
    }

    return false;
  }
}

export default QueueService;
