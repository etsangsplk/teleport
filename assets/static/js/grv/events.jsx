'use strict';

var EventsPage = React.createClass({
    onStartChange: function(e) {
        console.log(e.value);
    },
    onEndChange: function(e) {
        console.log(e.value);
    },
    showEvent: function(e){
        this.refs.event.show(e);
    },
    getInitialState: function(){
        return {entries: []};
    },
    componentDidMount: function() {
        this.reload();
        setInterval(this.reload, this.props.pollInterval);
    },
    reload: function(){
        var q = [
            {name: 'start', value: toRFC3339(new Date())},
            {name: 'limit', value: '20'},
            {name: 'order', value: '-1'},
        ];
        $.ajax({
            url: this.props.url+ "?"+ $.param(q),
            dataType: 'json',
            success: function(data) {
                this.setState({entries: data});
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(this.props.url, status, err.toString());
            }.bind(this)
        });
    },
    render: function() {
        return (
            <div id="wrapper">
              <LeftNavBar current="events"/>
              <div id="page-wrapper" className="gray-bg">
                <TopNavBar/>
                <PageHeader icon="fa fa-list" title="Timeline"/>
                <div className="wrapper wrapper-content">
                  <Box colClass="col-lg-8">
                    <EventsBox events={this.state.entries} onShowEvent={this.showEvent} onStartChange={this.onStartChange} onEndChange={this.onEndChange}/>
                  </Box>
                </div>
                <PageFooter/>
              </div>
              <EventForm ref="event"/>
            </div>);
    }
});

var EventsBox = React.createClass({
    render: function() {
        if (this.props.events.length == 0) {
            return (
                <div className="text-center m-t-lg">
                  <h1>Events</h1>
                  <small>There are no events that registered in this site.</small><br/><br/>
                </div>);
        }
        return (<EventsContainer {...this.props}/>);
    }
});

var EventsContainer = React.createClass({
    componentDidMount: function(){
        var el = $(React.findDOMNode(this.refs.daterange));
        el.find('.input-daterange').datepicker({
            keyboardNavigation: false,
            forceParse: false,
            autoclose: true
        }).on('changeDate', function(e){
            console.log(e)
        });
    },
    render: function() {
        var show = this.props.onShowEvent
        var events = this.props.events.map(function (server, index) {
            return (
                <EventBlock event={server} key={index} onShowEvent={show}/>
            );
        });
        return (
            <div>
              <div className="row">
                <div className="col-lg-8">
                  <div data-toggle="buttons" className="btn-group">
                    <label className="btn btn-sm btn-white active"> <input id="40" name="options" type="radio"/> Last 40 Events </label>
                    <label className="btn btn-sm btn-white"> <input id="100" name="options" type="radio"/> Last 100 Events </label>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="form-group" ref="daterange">
                    <div className="input-daterange input-group" id="datepicker">
                      <input type="text" className="input-sm form-control" name="start" onChange={this.props.onStartChange}/>
                      <span className="input-group-addon">to</span>
                      <input type="text" className="input-sm form-control" name="end" onChange={this.props.onEndChange}/>
                    </div>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-12">
                  <div id="vertical-timeline" className="vertical-container">
                    {events}
                  </div>
                </div>
              </div>
            </div>);
    }
});

var EventBlock = React.createClass({
    showEvent: function(e) {
        e.preventDefault();
        this.props.onShowEvent(this.props.event);
    },
    describe: function(event) {
        var info = {
            ago: timeSince(new Date(event.time)),
            time: new Date(event.time).toLocaleString(),
            user: event.properties.user,
            remoteaddr: event.properties.remoteaddr,
            localaddr: event.properties.localaddr,
            props: {},
        };
        switch (event.schema) {
        case "teleport.message":
            info.props = {
                bg: "lazur-bg",
                icon: "fa fa-comment",
                text: "sent message",
                well: event.properties.message,
            };
            break;
        case "teleport.auth.attempt":
            if (event.properties.success == "true") {
                info.props = {
                    bg: "lazur-bg",
                    icon: "fa fa-user",
                    text: "logged in"
                };
            } else {
                info.props = {
                    bg: "yellow-bg",
                    icon: "fa fa-user",
                    text: "could not log in: " + event.properties.error
                };
            }
            break;
        case "teleport.session":
            info.props = {
                bg: "blue-bg",
                icon: "fa fa-user",
                text: "opened shell session"
            };
            break;
        case "teleport.exec":
            info.props = {
                bg: "lazur-bg",
                icon: "fa fa-tty",
                text: event.properties.command
            };
            break;
        default:
            info.props = {
                bg: "lazur-bg",
                icon: "fa fa-question",
                text: "performed unknown action: "+event.schema
            };
        }
        return info;
    },
    render: function() {
        var e = this.props.event;
        var d = this.describe(e);
        var well = d.props.hasOwnProperty("well")?(<div className="well">{d.props.well}</div>):'';
        return (
            <div className="vertical-timeline-block">
              <div className={"vertical-timeline-icon " + d.props.bg}>
                <i className={d.props.icon}></i>
              </div>
              <div className="vertical-timeline-content">
                   <div className="media-body">
                    <small className="pull-right">{d.ago} ago</small>
                    <strong>{d.user}</strong> {d.props.text} <strong>{d.localaddr}</strong><br/>
                    <small className="text-muted">{d.time}</small>
                    {well}
                    <div className="actions">
                      <a href="#" onClick={this.showEvent} className="btn btn-xs btn-white"><i className="fa fa-folder"></i> View</a>
                    </div>
                  </div>
              </div>
            </div>
    );
  }
});

var EventForm = React.createClass({
    show: function(e) {
        if(e.schema != "teleport.session") {
            return;
        }
        var rid = e.properties.recordid;
        this.iter = 0
        this.term = new Terminal({
            cols: 120,
            rows: 24,
            useStyle: true,
            screenKeys: true,
            cursorBlink: false
        });
        this.term.open(React.findDOMNode(this.refs.term));
        this.refs.modal.open();
        if(rid == "") {
            this.term.write("this session was not recorded, or recording was deleted");
            this.player = null;
        } else {
            this.player = new Player(rid, this.term);
            this.player.start();
        }
    },
    close: function() {
        if(this.player != null) {
            this.player.stop();
        }
        this.term.destroy();
        this.refs.modal.close();
    },
    render: function() {
        return (
            <BootstrapModal dialogClass="modal-lg"
                            icon="fa-list"
                            ref="modal"
                            cancel="Close"
                            onCancel={this.close}
	                        title="SSH Session Log">
              <div ref="term" style={{width: '580px', height: '400px'}} className="text-center m-t-lg"></div>
            </BootstrapModal>
        );
    }
});


React.render(
  <EventsPage url={grv.path("api", "events")} pollInterval={2000}/>,
  document.body
);