(function(){
  const meta=document.querySelector('meta[name="wefinance-api-url"]');
  const API_URL=(meta?.content||localStorage.getItem('wefinance_api_url')||'').replace(/\/$/,'');
  window.WF_API={
    enabled:!!API_URL,
    url:API_URL,
    token:sessionStorage.getItem('wefinance_token')||'',
    user:JSON.parse(sessionStorage.getItem('wefinance_user')||'null'),
    async request(path,options={}){
      if(!API_URL)throw new Error('API URL belum dikonfigurasi');
      const headers={'Content-Type':'application/json',...(options.headers||{})};
      if(this.token)headers.Authorization='Bearer '+this.token;
      const res=await fetch(API_URL+path,{...options,headers});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||('API error '+res.status));
      return data;
    },
    async login(email,password){const d=await this.request('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});this.token=d.token;this.user=d.data;sessionStorage.setItem('wefinance_token',d.token);sessionStorage.setItem('wefinance_user',JSON.stringify(d.data));return d.data;},
    async register(name,email,password){const d=await this.request('/api/auth/register',{method:'POST',body:JSON.stringify({name,email,password})});this.token=d.token;this.user=d.data;sessionStorage.setItem('wefinance_token',d.token);sessionStorage.setItem('wefinance_user',JSON.stringify(d.data));return d.data;},
    logout(){this.token='';this.user=null;sessionStorage.removeItem('wefinance_token');sessionStorage.removeItem('wefinance_user');location.reload();},
    async bootstrap(){return (await this.request('/api/migration/bootstrap')).data;},
    async sync(){return this.request('/api/sync',{method:'POST',body:JSON.stringify({wallets,transactions,categories:typeof categories!=='undefined'?categories:[]})});}
  };
})();