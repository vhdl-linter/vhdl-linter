library ieee;
use ieee.std_logic_1164.all;

package test_aggregate is

end package;
package body test_aggregate is
  procedure RemoveExclude is
    variable foo : integer;
    variable bar : integer;
  begin
    (foo, bar) := integer_vector'(0, 0); -- Test if all of the aggregate values are writes
    report integer'image(foo) & integer'image(bar);
  end procedure RemoveExclude;

end package body;
