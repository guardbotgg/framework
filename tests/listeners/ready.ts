import { Listener } from '../framework';

export default Listener({
  name: 'clientReady',
  once: true,

  async execute(client) {
    console.log(`✅ Logged in as ${client.user?.tag}`);
  },
});