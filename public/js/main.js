//const URL = "https://one-percent-club-verf.onrender.com/";
//const URL = "http://localhost:3000";

const URL = window.location.href.indexOf("localhost") > -1 ? "http://localhost:3000" : "https://one-percent-club-verf.onrender.com/";

const socket = io(URL, { autoConnect: false });

const app = {
    data() {
      return {
        connectedToServer: false,
        username: '',
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
        playerAnswers: []
      }
    },
    methods: {
        BindSocketEvents() {
        let self = this;

        socket.on("connect", () => {
          console.log("Connected");
          self.connectedToServer = true;
        });
        
        socket.on("username_set", (isAdmin) => {
          self.usernameSet = true;
          self.isAdmin = isAdmin;
          console.log("username set");
        });

        socket.on("error", (err) => {
          console.log("ERROR: " + err);
          self.username = '';
          self.usernameSet = false;
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

        socket.on("disconnect", () => {
          console.log("DISCONNECTED");
          self.username = '';
          self.usernameSet = false;
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
      ConnectToServer() {
        if (this.username != '') {
          socket.connect();
          socket.emit("set_username", this.username);
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
      }
    },
    mounted() {
      this.BindSocketEvents();
    }
};

Vue.createApp(app).mount('#app');