library IEEE;
use IEEE.std_logic_1164.all;

package test_attribute_reference is
end package;
package body test_attribute_reference is


  function foo(Size : integer) return std_logic_vector is
    variable Data : std_logic_vector(Size - 1 downto 0);
  begin

    Data := (Data'range => 'X');

    return Data;
  end function foo;
end package body;
