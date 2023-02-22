library ieee;
use ieee.std_logic_1164.all;

package test_pkg is
  type t_enum is (enum0, enum1);

  type t_record is record
    element0: std_ulogic;
    element1: t_enum;
  end record;

end package test_pkg;
package body test_pkg is
end package body test_pkg;
