import { useEffect, useState } from "react";
import moment from 'moment';
import "./App.css";
import QueueService from "./services/queue.service";

import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-monokai";

const INVISIBILITY_SECONDS = 5;
const DATE_MASK = "DD/MM HH:mm:ss";

const queueService = new QueueService({ seconds: INVISIBILITY_SECONDS });

function MessageProducer(props) {
  const placeholder = JSON.stringify({ "teste": true }, null, 2);

  const [messageBody, setMessageBody] = useState(placeholder);

  const { onSubmit } = props;


  const handleSubmit = (e) => {
    e.preventDefault();

    onSubmit(messageBody);

    setMessageBody(placeholder);
  };

  const handleChange = (e) => {
    setMessageBody(e);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <AceEditor
          mode="json"
          theme="monokai"
          name="newMessageBody"
          onChange={handleChange}
          fontSize={14}
          showPrintMargin={true}
          showGutter={true}
          highlightActiveLine={true}
          value={messageBody}
          width="100%"
          setOptions={{
            scrollPastEnd: true,
            showLineNumbers: true,
            tabSize: 2,
          }}
        />
                  
        <input type="submit" name="Postar" value="Postar" />
      </form>
    </div>
  );
}

function MessageList(props) {
  const { messages = [], onCommit } = props;

  const hasMessages = !!messages && messages.filter(m => !!m).length > 0;

  return (
    <div className="tableWrapper">
      <table>
        <thead>
          <tr>
            <th width={200}>Id</th>
            <th width={200}>Postada em</th>
            <th width={200}>Visível após</th>
            <th width={200}>Visibilidade</th>
            <th width={200}></th>
          </tr>
        </thead>
        <tbody>
          {hasMessages && messages.map((message) => message && (
            <Message key={message.id} message={message} onCommit={onCommit} />
          ))}
          {!hasMessages && (
            <tr>
              <td className="emptyListMessage" colSpan="5">
                Não há mensagens para exibir.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Message(props) {
  const { message, onCommit } = props;

  const onClickCommit = (e) => {
    e.preventDefault();
    onCommit(message.id);
  };

  const now = moment();
  const messageVisibleAfter = moment(message.visibleAfter, DATE_MASK);

  const secondsLeft = messageVisibleAfter.diff(now, 'seconds')
  const color = secondsLeft <= 0 ? "inherit" : "grey";

  return (
    <tr style={{ color }}>
      {!!message && (
        <>
          <td>{message.id}</td>
          <td>{message.postedAt}</td>
          <td>
            {message.visibleAfter}
          </td>
          <td width={200}>
            {secondsLeft > 0 ? (
              <span style={{ color: 'red'}}>{`Visível em ${secondsLeft} segundos`} &nbsp;</span>
            ) : (
              <span>{`Visível`}</span>
            )}
          </td>
          <td>
            {secondsLeft <= 0 && (
              <a href={`#commit_${message.id}`} onClick={onClickCommit}>
                Commit
              </a>
            )}
          </td>
        </>
      )}
      {!message && (
        <>
          <td colSpan="4">Sem mensagem</td>
        </>
      )}
    </tr>
  );
}

function MessageConsumer(props) {
  const {
    onCommit,
    onConsume,
  } = props;

  const [showMessageCommitError, setShowMessageCommitError]= useState(false);
  const [editorInstance, setEditorInstance] = useState(null);
  const [enableCommit, setEnableCommit] = useState(false);
  const [enableConsume, setEnableConsume] = useState(true);
  const [enableReset, setEnableReset] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (editorInstance && message?.body) {
      editorInstance.setValue(JSON.stringify(message, null, 2))
    }
  }, [message, editorInstance])

  const clear = () => {
    if (editorInstance) {
      editorInstance.setValue('');
    }
    setEnableCommit(false);
    setEnableConsume(true);
    setEnableReset(false);
    setMessage(null);
  }

  const handleCommit = () => {
    const id = message?.id;
    if (!!id) {
      setShowMessageCommitError(!onCommit(id));
      clear();
    }
  }

  const handleReset = () => {
    setShowMessageCommitError(false);
    clear();
  }

  const handleConsume = () => {
    setShowMessageCommitError(false);
    const consumedMessage = onConsume();
    if (consumedMessage) {
      setMessage(consumedMessage);
      setEnableCommit(true);
      setEnableConsume(false);
      setEnableReset(true);
    }
  }

  const onEditorLoad = (instance) => {
    setEditorInstance(instance);
  }

  return (
    <div>
      <AceEditor
        mode="json"
        theme="monokai"
        name="consumerMessage"
        fontSize={14}
        showPrintMargin={true}
        showGutter={true}
        highlightActiveLine={true}
        value={message?.body}
        width="100%"
        onLoad={onEditorLoad}
        setOptions={{
          readOnly: true,
          scrollPastEnd: true,
          showLineNumbers: true,
          tabSize: 2,
        }}
        />

      {  
        (showMessageCommitError && <div>
          <em>Erro ao commitar a mensagem!</em>
        </div>)
      }
      <div>
        <button disabled={!enableCommit} onClick={handleCommit}>Commitar</button>
        <button disabled={!enableConsume} onClick={handleConsume}>Consumir</button>
        <button disabled={!enableReset} onClick={handleReset}>Resetar</button>
        {!!message && <span>ID: {message.id}</span>}
      </div>
    </div>
  )
}

function App() {
  const [messages, setMessages] = useState(queueService.list());

  const updateList = () => {
    const messageList = queueService.list().map((m) => {
      return {
        ...m,
        postedAt: m.postedAt.format(DATE_MASK),
        visibleAfter: m.visibleAfter.format(DATE_MASK),
      };
    });

    setMessages(messageList);
  };

  setInterval(() => {
    updateList();
  }, INVISIBILITY_SECONDS)

  const onSubmit = (body) => {
    queueService.post({ body });
    updateList();
  };

  const onCommit = (id) => {
    if(queueService.commit(id)) {
      updateList();
      return true;
    }

    return false;
  };

  const onConsumerCommit = (id) => {
    if (queueService.commit(id)) {
      updateList();

      return true;
    }

    return false;
  };

  const onConsume = () => {
    const message = queueService.get();
    if (message) {
      updateList();

      return { 
        ...message, 
        postedAt: message.postedAt.format(DATE_MASK), 
        visibleAfter: message.visibleAfter.format(DATE_MASK),
      };
    }

    return null;
  }

  return (
    <div>
      <h1>Messageria</h1>
      <section id="nuvem">
        <h2>Nuvem</h2>
        <section id="fila">
          <h3>Fila</h3>
          <MessageList messages={messages} onCommit={onCommit} />
        </section>
      </section>
      <section id="aplicacao">
        <h2>Aplicacao</h2>
        <section id="producer">
          <h3>Producer</h3>
          <MessageProducer onSubmit={onSubmit} />
        </section>
        <section id="consumer">
          <h3>Consumer 1</h3>
          <MessageConsumer 
            onConsume={onConsume} 
            onCommit={onConsumerCommit} 
          />
        </section>
        <section id="consumer">
          <h3>Consumer 2</h3>
          <MessageConsumer 
            onConsume={onConsume} 
            onCommit={onConsumerCommit} 
          />
        </section>
      </section>
    </div>
  );
}

export default App;
