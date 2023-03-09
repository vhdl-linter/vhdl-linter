library ieee;
use ieee.std_logic_1164.all;

entity test_selected_name is
end entity;

architecture rtl of test_selected_name is
  type t is record
    apple  : std_ulogic;
    banana : std_ulogic;
  end record;

  constant apple: std_ulogic := '1'; -- fake apple to make sure they only find the apple of the record

  type arr is array(natural range <>) of t;

  function wrapper_unused(param: arr) return std_ulogic is
    alias constrainedT: arr(1 to 2) is param;
  begin
    param(0).banana <= constrainedT(1).apple;
  end function;
begin


end architecture;
