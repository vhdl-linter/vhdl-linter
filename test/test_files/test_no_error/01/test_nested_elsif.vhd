entity test_nested_elsif is
end test_nested_elsif;
architecture arch of test_nested_elsif is


begin
  gen : if a_label : true generate

  elsif b_label : true generate
    gen_inner : if d_label : true generate

    elsif e_label : true generate

    end generate;
  else c_label : generate

       end generate;
  end arch;
