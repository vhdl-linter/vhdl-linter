package pkg is

end package;

package body pkg is
  function fu return integer is
  begin
    loop_label : while true loop
      exit loop_label;
    end loop;
  end function;
end package body;