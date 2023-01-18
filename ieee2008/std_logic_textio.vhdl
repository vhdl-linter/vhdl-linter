-- --------------------------------------------------------------------
--
-- Copyright © 2008 by IEEE.
--
-- This source file is an essential part of IEEE Std 1076-2008, 
-- IEEE Standard VHDL Language Reference Manual. Verbatim copies of this 
-- source file may be used and distributed without restriction. 
-- Modifications to this source file as permitted in IEEE Std 1076-2008
-- may also be made and distributed. All other uses require permission 
-- from the IEEE Standards Department(stds-ipr@ieee.org). 
-- All other rights reserved.
--
-- This source file is provided on an AS IS basis. The IEEE disclaims ANY 
-- WARRANTY EXPRESS OR IMPLIED INCLUDING ANY WARRANTY OF MERCHANTABILITY 
-- AND FITNESS FOR USE FOR A PARTICULAR PURPOSE. The user of the source file 
-- shall indemnify and hold IEEE harmless from any damages or liability 
-- arising out of the use thereof.
--
--   Title     :  Standard multivalue logic package
--             :  (STD_LOGIC_TEXTIO package declaration)
--             :
--   Library   :  This package shall be compiled into a library
--             :  symbolically named IEEE.
--             :
--   Developers:  Accellera VHDL-TC and IEEE P1076 Working Group
--             :
--   Purpose   :  This packages is provided as a replacement for non-standard
--             :  implementations of the package provided by implementers of
--             :  previous versions of this standard. The declarations that
--             :  appeared in those non-standard implementations appear in the
--             :  package STD_LOGIC_1164 in this standard.
--             :
--   Note      :  No declarations or definitions shall be included in,
--             :  or excluded from this package.
--             :
-- --------------------------------------------------------------------
-- $Revision: 1305 $
-- $Date: 2008-06-27 14:28:49 +0930 (Fri, 27 Jun 2008) $
-- --------------------------------------------------------------------

use STD.TEXTIO.all;
use IEEE.std_logic_1164.all;

PACKAGE std_logic_textio IS

  alias READ  is IEEE.std_logic_1164.READ [LINE, STD_ULOGIC];
  alias READ  is IEEE.std_logic_1164.READ [LINE, STD_ULOGIC, BOOLEAN];
  alias READ  is IEEE.std_logic_1164.READ [LINE, STD_ULOGIC_VECTOR];
  alias READ  is IEEE.std_logic_1164.READ [LINE, STD_ULOGIC_VECTOR, BOOLEAN];
  alias WRITE is IEEE.std_logic_1164.WRITE [LINE, STD_ULOGIC, SIDE, WIDTH];
  alias WRITE is IEEE.std_logic_1164.WRITE [LINE, STD_ULOGIC_VECTOR, SIDE, WIDTH];

  alias HREAD  is IEEE.std_logic_1164.HREAD [LINE, STD_ULOGIC_VECTOR];
  alias HREAD  is IEEE.std_logic_1164.HREAD [LINE, STD_ULOGIC_VECTOR, BOOLEAN];
  alias HWRITE is IEEE.std_logic_1164.HWRITE [LINE, STD_ULOGIC_VECTOR, SIDE, WIDTH];

  alias OREAD  is IEEE.std_logic_1164.OREAD [LINE, STD_ULOGIC_VECTOR];
  alias OREAD  is IEEE.std_logic_1164.OREAD [LINE, STD_ULOGIC_VECTOR, BOOLEAN];
  alias OWRITE is IEEE.std_logic_1164.OWRITE [LINE, STD_ULOGIC_VECTOR, SIDE, WIDTH];

END PACKAGE std_logic_textio;
