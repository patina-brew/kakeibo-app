<template>
  <header class="header">
    <h1>家計簿</h1>
    <nav>
      <RouterLink to="/" data-nav="calendar">カレンダー</RouterLink>
      <RouterLink to="/summary" data-nav="summary">集計</RouterLink>
    </nav>
  </header>
  <main class="main">
    <RouterView />
  </main>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #d9e2ec;
}
h1 {
  margin: 0;
  font-size: 1.2rem;
}
nav {
  display: flex;
  gap: 16px;
}
nav a {
  color: #52606d;
  text-decoration: none;
  padding: 4px 0;
}
nav a.router-link-exact-active {
  color: #2b6cb0;
  border-bottom: 2px solid #2b6cb0;
}
.main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 16px;
}
</style>
