var rascal = require('rascal')
var broker_for_purge = null;

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

var cert_64 = (global_config.message_queue.settings.cert_64) ? 
    new DataView(toArrayBuffer(Buffer.from(global_config.message_queue.settings.cert_64, 'base64'))) : 
    undefined  

const rascal_config =
{
    "vhosts": {
        "/": {
            "connection": {
                "url": global_config.message_queue.settings.uri,
                "socketOptions": {
                    "ca": cert_64
                },
                "retry": {
                    "min": 1000,
                    "max": 60000,
                    "factor": 2,
                    "strategy": "exponential"
                }
            },
            exchanges: {
                "amq.topic": {
                    "assert": true,
                    "options": {
                        "durable": true,
                        "persistent": true
                    }
                }
            },
            queues: {},
            bindings: {},
            publications: {},
            subscriptions: {}
        }
    }
};

const queue_options = {
    "assert": true,
    "options": {
        "durable": true,
        "exclusive": false,
        "persistent": true
    }
};

async function rascal_produce(env, msg){
    // creating connection
    if (env === null) {
      env = "default";
    }
    var queue_name;
    if (env === "default") {
      queue_name = "analysis_general_listen";
    } else {
      queue_name = "analysis_general_listen_" + env;
    }
    var publication_name = "create_jobs_" + env;
    produce_rascal_config = JSON.parse(JSON.stringify(rascal_config));
    produce_rascal_config["vhosts"]["/"]["queues"][queue_name] = queue_options;
    produce_rascal_config["vhosts"]["/"]["bindings"][publication_name] = {
        "source": "amq.topic",
        "destination": queue_name,
        "destinationType": "queue",
        "bindingKey": queue_name
    };
    produce_rascal_config["vhosts"]["/"]["publications"][publication_name] = {
        vhost: "/",
        exchange: "amq.topic",
        routingKey: queue_name,
        confirm: false,
        options: {
            persistent: true,
            retry: { delay: 1000 }
        }
    };

    rascal.Broker.create(produce_rascal_config, (err, broker) => {
        if (err) {
            console.error(err);
            return;
        }
        broker_for_purge = broker;
        broker.on('error', console.error);

        // Publish a message
        broker.publish(publication_name, msg, (err, publication) => {
            if (err) return console.log(err)
            publication
                .on('success', function(){
                    // success
                    console.log("Published message to RabbitMQ");
                })
                .on('error', console.error)
        })
    })
}

var sendToQueue = function(env, msg){
    rascal_produce(env, msg).catch(console.error);
}

async function rascal_consume(_on_callback){
    // creating connection
    var queue_name = "analysis_respond";
    var binding_name = "job_run_finished";
    var subscription_name = "get_finished_jobs";
    consume_rascal_config = JSON.parse(JSON.stringify(rascal_config));
    consume_rascal_config["vhosts"]["/"]["queues"][queue_name] = queue_options;
    consume_rascal_config["vhosts"]["/"]["bindings"][binding_name] = {
        "source": "amq.topic",
        "destination": queue_name,
        "destinationType": "queue",
        "bindingKey": queue_name
    };
    consume_rascal_config["vhosts"]["/"]["subscriptions"][subscription_name] = {
        vhost: "/",
        queue: queue_name,
        contentType: "application/json",
        prefetch: 1,
        retry: { delay: 1000 }
    };

    rascal.Broker.create(consume_rascal_config, (err, broker) => {
        if (err) {
            console.error(err);
            return;
        }
      
        broker.on('error', console.error);
        
        // Consume a message
        broker.subscribe('get_finished_jobs', (err, subscription) => {
            if (err) {
                console.error(err);
                return;
            }

            console.log("Started consuming messages from RabbitMQ...");
            subscription
                .on('message', (message, content, ackOrNack) => {
                    console.log(content);
                    _on_callback(content);
                    ackOrNack();
                })
                .on('error', (err) => {
                    console.error('RabbitMQ subscriber error: ' + err)
                })
        })
    })
}

var subscribeToQueue = function(_on_callback){
    rascal_consume(_on_callback).catch(console.error);
}

async function rascal_purge(next) {
    if (broker_for_purge){
        await broker_for_purge.purge(next)
    }
}

var purgeQueue = function(next){
    return rascal_purge(next)
}

module.exports = {
    subscribeToQueue:subscribeToQueue,
    sendToQueue:sendToQueue,
    purgeQueue: purgeQueue
}