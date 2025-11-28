module.exports = {
    apps: [
        {
            name: 'datahive-worker-1',
            script: './datahive.js',
            env_file: '.env.device1',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '700M',
            error_file: './logs/worker1-error.log',
            out_file: './logs/worker1-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        },
        {
            name: 'datahive-worker-2',
            script: './datahive.js',
            env_file: '.env.device2',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '700M',
            error_file: './logs/worker2-error.log',
            out_file: './logs/worker2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        },
        {
            name: 'datahive-worker-3',
            script: './datahive.js',
            env_file: '.env.device3',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '700M',
            error_file: './logs/worker3-error.log',
            out_file: './logs/worker3-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        }
    ]
};
