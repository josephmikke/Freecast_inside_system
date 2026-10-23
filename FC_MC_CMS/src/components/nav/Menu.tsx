import React, { useEffect, useState } from 'react';
import {
  Link,
  useMatch,
  useResolvedPath,
} from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import userIcon from '@assets/icons/menuItems/user.png';
import epgIcon from '@assets/icons/menuItems/epg.png';
import integrationIcon from '@assets/icons/menuItems/integrations.png';
import channelMonitorIcon from '@assets/icons/menuItems/channelmonitor.png';
import georulesIcon from '@assets/icons/menuItems/georules.png';
import packagesIcon from '@assets/icons/menuItems/packages.png';
import providersIcon from '@assets/icons/menuItems/provider.png';
import platformIcon from '@assets/icons/menuItems/platform.png';
import categoriesIcon from '@assets/icons/menuItems/categories.png';
import genresIcon from '@assets/icons/menuItems/genres.png';
import locationIcon from '@assets/icons/menuItems/location.png';
import permissionGroup from '@assets/icons/menuItems/permissionsGroup.png';
import usersIcon from '@assets/icons/menuItems/users.png';
import vodIcon from '@assets/icons/menuItems/vod.png';
import channelsIcon from '@assets/icons/menuItems/channels.png';
import logIcon from '@assets/icons/menuItems/log.png';

function CustomLink({
  children, to, icon, isMenuHidden, ...props
}: LinkProps & { icon?: any, isMenuHidden: boolean }) {
  const resolved = useResolvedPath(to);
  const match = useMatch({ path: resolved.pathname, end: true });

  const renderIcon = () => <img src={icon} alt="icon" style={{ width: '38px' }} />;

  return (
    <Link
      className={`menu_item ${match ? 'active' : ''}`}
      to={to}
      {...props}
    >
      <div className="menu_item_icon">
        {renderIcon()}
      </div>
      <div className={`menu_item_text ${isMenuHidden ? 'hide-text' : ''}`}>
        {children}
      </div>
    </Link>
  );
}

// eslint-disable-next-line max-len
function Group({ title, children, isMenuHidden }: { title: string, children: React.ReactNode, isMenuHidden: boolean }) {
  return (
    <div className="menu_group">
      <h3 className={`menu_group_title ${isMenuHidden ? 'hide-text' : ''}`}>{title}</h3>
      <div className="menu_group_list">{children}</div>
    </div>
  );
}

function ContentGroup({ isMenuHidden }: { isMenuHidden: boolean }) {
  return (
    <Group title="Content" isMenuHidden={isMenuHidden}>
      <CustomLink to="/content/channels" icon={channelsIcon} isMenuHidden={isMenuHidden}>Channels</CustomLink>
      <CustomLink to="/content/vod?type=movies" icon={vodIcon} isMenuHidden={isMenuHidden}>VOD</CustomLink>
      <CustomLink to="/content/epgtemplates" icon={epgIcon} isMenuHidden={isMenuHidden}>EPG Templates</CustomLink>
      <CustomLink to="/content/ingestions" icon={integrationIcon} isMenuHidden={isMenuHidden}>Ingestions</CustomLink>
      <CustomLink to="/content/channelmonitor" icon={channelMonitorIcon} isMenuHidden={isMenuHidden}>Channel Monitor</CustomLink>
    </Group>
  );
}

function ConfigurationsGroup({ isMenuHidden }: { isMenuHidden: boolean }) {
  return (
    <Group title="Configurations" isMenuHidden={isMenuHidden}>
      <CustomLink to="/configurations/geoiprules" icon={georulesIcon} isMenuHidden={isMenuHidden}>GeoIP Rules</CustomLink>
      <CustomLink to="/configurations/packages" icon={packagesIcon} isMenuHidden={isMenuHidden}>Packages</CustomLink>
      <CustomLink to="/configurations/providers" icon={providersIcon} isMenuHidden={isMenuHidden}>Providers</CustomLink>
      <CustomLink to="/configurations/platforms" icon={platformIcon} isMenuHidden={isMenuHidden}>Platforms</CustomLink>
      <CustomLink to="/configurations/categories" icon={categoriesIcon} isMenuHidden={isMenuHidden}>Categories</CustomLink>
      <CustomLink to="/configurations/genres" icon={genresIcon} isMenuHidden={isMenuHidden}>Genres</CustomLink>
      <CustomLink to="/configurations/locations" icon={locationIcon} isMenuHidden={isMenuHidden}>Locations</CustomLink>
    </Group>
  );
}

function AdminGroup({ isMenuHidden }: { isMenuHidden: boolean }) {
  return (
    <Group title="Admin" isMenuHidden={isMenuHidden}>
      <CustomLink to="/admin/permissions-groups" icon={permissionGroup} isMenuHidden={isMenuHidden}>Permission Groups</CustomLink>
      <CustomLink to="/admin/users" icon={usersIcon} isMenuHidden={isMenuHidden}>Users</CustomLink>
      <CustomLink to="/admin/logs" icon={logIcon} isMenuHidden={isMenuHidden}>Logs</CustomLink>
    </Group>
  );
}

export default function Menu() {
  const [isMenuHidden, setIsMenuHidden] = useState(window.innerWidth <= 1480);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1300) {
        setIsMenuHidden(true);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  return (
    <>
      <button className="collapse-menu-button" type="button" onClick={() => setIsMenuHidden(!isMenuHidden)}>
        {isMenuHidden ? '☰' : '✕'}
      </button>
      <nav className={`menu ${isMenuHidden ? 'menu-hidden' : ''}`}>
        <CustomLink to="/user" icon={userIcon} isMenuHidden={isMenuHidden}>Current User</CustomLink>
        <ContentGroup isMenuHidden={isMenuHidden} />
        <ConfigurationsGroup isMenuHidden={isMenuHidden} />
        <AdminGroup isMenuHidden={isMenuHidden} />
      </nav>
    </>
  );
}
