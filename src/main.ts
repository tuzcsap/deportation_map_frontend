import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar } from 'quasar'

import 'quasar/src/css/index.sass'

import App from './App.vue'
import router from './router'

import VueMapboxTs from 'vue-mapbox-ts'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueMapboxTs)
app.use(Quasar, {
  plugins: {}
})

app.mount('#app')
