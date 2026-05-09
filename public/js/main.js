//const URL = "https://one-percent-club-verf.onrender.com/";
//const URL = "http://localhost:3000";

const URL = window.location.href.indexOf("localhost") > -1 ? "http://localhost:80" : "http://game.onepercent.club"; //"https://one-percent-club-verf.onrender.com/";
const noSleep = new NoSleep();

const socket = io(URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

const app = {
    data() {
      return {
        connectedToServer: false,
        disconnected: false,
        username: '',
        clientKey: '',
        usernameSet: false,
        isAdmin: false,
        gameState: {
          GameStarted: false,
          AnswerOptions: []
        },
        adminGameState: {},
        answer: '',
        player: {
          PGState: 0
        },
        hasAnswered: false,
        playerList: [],
        activeIndex: -1,
        playerAnswers: [],
        displayPicture: null,
        error: '',
        debug: true,
        reconnecting: false
      }
    },
    methods: {
        BindSocketEvents() {
        let self = this;

        socket.on("connect", () => {
          console.log("Connected");
          self.connectedToServer = true;
          self.disconnected = false;

          let savedName = localStorage.getItem('pgUsername');
          //let savedClientKey = localStorage.getItem('clientKey'); 

          if (savedName && !self.usernameSet) {
            // Returning player
            self.username = savedName;
            //self.clientKey = savedClientKey ?? ''; 
            socket.emit("set_username", {
              name: savedName,
              file: null,
              extension: '',
              isReconnect: true,
              clientKey: self.clientKey
            });
          } else if (self.username != '') {
            // First time connection from ConnectToServer()
            let fileExtension = '';
            if (self.displayPicture != null) {
              let tmp = self.displayPicture.name.split('.');
              fileExtension = '.' + tmp[tmp.length - 1];
            }

            socket.emit("set_username", { 
              name: self.username, 
              file: self.displayPicture, 
              extension: fileExtension,
              isReconnect: false,
              clientKey: self.clientKey
            });
          }
        });

        socket.on("disconnect", () => {
          console.log("Disconnected");
          self.connectedToServer = false;
          self.disconnected = true;
          self.usernameSet = false;
        });
        
        socket.on("username_set", (isAdmin) => {
          localStorage.setItem('pgUsername', this.username);
          localStorage.setItem('clientKey', this.clientKey);
          
          self.reconnecting = false;
          self.usernameSet = true;
          self.isAdmin = isAdmin;
          console.log("username set");
        });

        socket.on("error", (err) => {
          console.log("ERROR: " + err);
          self.username = '';
          self.usernameSet = false;
          localStorage.removeItem('pgUsername');
        });

        socket.on("update_state", (data) => {
          self.gameState = data;
          console.log(data);

          if (self.gameState.QuestionState == 0) { // Reset 
            self.activeIndex =  -1;
            self.hasAnswered = false;
            self.answer = '';
            self.playerAnswers = [];
          }
        });

        socket.on("update_player_state", (data) => {
          self.player = data;
          console.log(data);
        });

        socket.on("timer_finished", () => {
          self.activeIndex =  -1;
        });

        // ADMIN
        socket.on("admin_playerjoined", (player) => {
          self.playerList.push(player);
        });

        socket.on("admin_playerleft", (player) => {
          self.playerList.splice(self.playerList.indexOf(player), 1);
        });

        socket.on("admin_startgame", () => {
          self.gameState.GameStarted = true;
        });

        socket.on("update_admin_panel_state", (data) => {
          self.adminGameState = data;
        });

        socket.on("receive_player_data", (data) => {
          self.player = data;
        });

         socket.on("admin_answer_submitted", (data) => {
          self.playerAnswers.push(data);
        });
        // ADMIN
      },
      FileSelected(evt) {
        this.displayPicture = evt.target.files[0];
      },
      ConnectToServer() {
        noSleep.enable();
        
        if (this.username != '' && !this.connectedToServer) {
          socket.connect();

          // let fileExtension = '';
          // if (this.displayPicture != null){
          //   let tmp = this.displayPicture.name.split('.');
          //   fileExtension = '.' + tmp[tmp.length - 1];
          // }
          // socket.emit("set_username", { "name": this.username, "file": this.displayPicture, "extension": fileExtension });
        }
      },
      StartGame() {
        socket.emit("start_game");
      },
      PostIntro() {
        socket.emit("admin_postintro");
      },
      PlayerIntro() {
        socket.emit("admin_playerintro");
      },
      NextQuestion() {
        socket.emit("admin_nextquestion");
      },
      AdvanceQuestion() {
        socket.emit("admin_advancequestion");
      },
      SelectAnswer(option) {
        this.answer = option;
      },
      SubmitAnswer() {
        this.hasAnswered = true;
        socket.emit("send_answer", { "name": this.username, "qKey": this.gameState.QuestionID, "answer": this.answer });
      },
      UsePass() {
        // send 
        if (confirm("Are you sure you want to use your pass?")){
          this.hasAnswered = true;
          socket.emit("use_pass", { "name": this.username, "qKey": this.gameState.QuestionID });
        }
      },
      selectedOption(option, index) {
        this.answer = option.OptionName;

        if (this.activeIndex === index) {
            this.activeIndex = null;
        } else {
            this.activeIndex = index;
        }
      },
      WalkAway() {
        this.player.PGState = 2;
        this.hasAnswered = true;
        socket.emit("walk_away", { "name": this.username, "qKey": this.gameState.QuestionID });
      },
      SetAnswerAsCorrect(playerAnswer) {
        this.playerAnswers.splice(this.playerAnswers.indexOf(playerAnswer), 1);
        socket.emit("admin_mark_as_correct", playerAnswer);
      },
      SetAnswerAsIncorrect(playerAnswer) {
        this.playerAnswers.splice(this.playerAnswers.indexOf(playerAnswer), 1);
      },
      Reconnect() {
        socket.connect();
      },
      uuidv4() {
        return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
          (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
      },
      ResetUserData() {
        localStorage.clear();
        window.location.reload();
      }
    },
    mounted() {
      this.BindSocketEvents();

      let savedName = localStorage.getItem('pgUsername');
      let clientKey = localStorage.getItem('clientKey');

      if (!clientKey || clientKey == '') {
        this.clientKey = this.uuidv4();
      }
      else {
        this.clientKey = clientKey;
      }

      if (savedName && savedName != "") {
        this.username = savedName;
       
        this.reconnecting = true;

        this.$nextTick(() => {
          // Wait for Vue to finish updating before connecting
          this.Reconnect();
        });
      }
    }
};

Vue.createApp(app).mount('#app');