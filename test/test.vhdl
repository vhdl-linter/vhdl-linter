--------------------------------------------------------------------------------------------------
-- #######   #####    #####
-- #        #     #  #     #
-- #        #        #
-- #####     #####   #  ####
-- #              #  #     #
-- #        #     #  #     #
-- #######   #####    #####
--
-- Fraunhofer HHI - Embedded Systems Group
--Copyright:
-- 2017 Fraunhofer Institute for Telecommunications, Heinrich-Hertz-Institut (HHI)
-- The copyright of this software source code is the property of HHI.
-- This software may be used and/or copied only with the written permission
-- of HHI and in accordance with the terms and conditions stipulated
-- in the agreement/contract under which the software has been supplied.
-- The software distributed under this license is distributed on an "AS IS" basis,
-- WITHOUT WARRANTY OF ANY KIND, either expressed or implied.
--! @file   yolo.vhd
--! @author Schulte, Anton,   < anton.schulte 'at' hhi.fraunhofer.de>
--! @brief  yolo
--! @details
--! @date   2017-11-03
-- Date         Version Author          Description
---------------------------------------------------------------------------------------------------
-- 2017-11-03   1.0     Schulte         initial design
---------------------------------------------------------------------------------------------------

library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


library esgiplib;
use esgiplib.pkg_Datatype.all;
asd --asdasd
entity yolo is
  port(
    i_clk           : in std_logic;
    i_reset         : in std_logic
    );
end entity;

architecture rtl of yolo is
  signal s_reset : std_logic;
begin
  s_reset <= '1';
end architecture;
