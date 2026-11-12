import { Grid, LinkCards, Page, Section, Table, Text, useGrokTheme } from '../compat/grok-canvas';
import { bonus, games } from '../catalog';

export function HomePage() {
  const theme = useGrokTheme();
  return (
    <Page
      title="小游戏厅"
      summary="四十一款小游戏，一个入口。选一张卡片，直接开玩。"
      width="wide"
      lang="zh-Hans"
    >
      <Text>
        <span style={{ color: theme.text.secondary }}>
          这里收齐了已做好的小游戏：想练反应就选街机，想慢慢琢磨就选益智。全部在本站内打开，不跳转到外部页面。手机竖屏也可以玩：多数游戏可点「全屏游玩」，街机类用半透明十字键，棋牌点选即可。横屏较扁时可转回竖屏，不必换到电脑。具体操作见各游戏内说明。
        </span>
      </Text>
      <Section heading="挑一款，开始玩">
        <Grid columns={3}>
          {games.map((game) => (
            <LinkCards
              key={game.slug}
              links={[{ title: game.title, site: game.site, href: '/games/' + game.slug }]}
            />
          ))}
        </Grid>
      </Section>
      <Section heading="上手小贴士">
        <Table
          columns={['游戏', '一句话提示']}
          align={['start', 'start']}
          rows={games.map((game) => [game.title, game.tip])}
        />
      </Section>
      <Section heading="加映：写点小程序">
        <Text>不想打游戏？到 TinyLang 游乐场，试试页内语言解释器。</Text>
        {bonus.map((item) => (
          <LinkCards
            key={item.slug}
            links={[{ title: item.title, site: item.site, href: '/games/' + item.slug }]}
          />
        ))}
      </Section>
    </Page>
  );
}
