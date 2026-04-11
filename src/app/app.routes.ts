import { Routes } from '@angular/router';
import { Home } from './home/home';
import { AuthComponent } from './auth/auth';
import { WriterComponent } from './writer/writer';
import { CreateNovelComponent } from './create-novel/create-novel';
import { SettingsComponent } from './settings/settings';
import { NovelReaderComponent  } from './read-novel/novel-reader'
export const routes: Routes = [
  { path: '', component: Home },
  { path: 'auth', component: AuthComponent },
  { path: 'writer', component: WriterComponent },
  { path: 'writer/create', component: CreateNovelComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'read/:id', component: NovelReaderComponent  },
  { path: '**', redirectTo: '' },
];