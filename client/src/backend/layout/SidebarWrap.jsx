import React from "react";
import { Menu, MenuItem, Sidebar, SubMenu } from 'react-pro-sidebar';
import { Link } from "react-router-dom";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import HomeIcon from '@mui/icons-material/Home';
import DescriptionIcon from '@mui/icons-material/Description';

const SidebarWrap = () => {
    return (
        <Sidebar>
            <Menu>
                <SubMenu label="General" icon={<HomeIcon />}>
                    <MenuItem> Company </MenuItem>
                    <MenuItem component={<Link to="/list" />}> List </MenuItem>
                </SubMenu>
                <MenuItem icon={<DescriptionIcon />}> Documentation </MenuItem>
                <MenuItem active icon={<CalendarMonthIcon />}>
                    Calendar (active)
                </MenuItem>
            </Menu>
        </Sidebar>
    )
}

export default SidebarWrap;