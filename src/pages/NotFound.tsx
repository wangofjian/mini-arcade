import { Link } from 'react-router-dom';
import { Page, Section, Text } from '../compat/grok-canvas';

export function NotFoundPage() {
  return (
    <Page title="未找到页面" summary="没有这个地址对应的游戏。" width="column" lang="zh-Hans">
      <Section>
        <Text>
          请回到 <Link to="/">小游戏厅首页</Link> 再选一款。
        </Text>
      </Section>
    </Page>
  );
}
